import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DocumentType } from '@database/entities';
import * as crypto from 'crypto';
import { Buffer } from 'buffer';
import { firstValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as franc from 'franc';
import { CustomLoggerService } from '@shared/logger/logger.service';
import { MonitoringService } from '@shared/monitoring/monitoring.service';
import { logSafeError } from '@shared/utils/error-guards';

export interface ParsedDocument {
  content: string;
  metadata: {
    title?: string;
    author?: string;
    language?: string;
    pageCount?: number;
    wordCount: number;
    characterCount: number;
    extractedAt: Date;
    contentHash: string;
    [key: string]: any;
  };
}

@Injectable()
export class DocumentParsingService {
  private readonly logger: CustomLoggerService;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly monitoring: MonitoringService
  ) {
    this.logger = new CustomLoggerService(this.configService, DocumentParsingService.name);
  }

  async parseDocumentFile(
    file: Express.Multer.File | Buffer,
    type: DocumentType,
    filename?: string
  ): Promise<ParsedDocument> {
    const startTime = Date.now();
    const buffer = Buffer.isBuffer(file) ? file : file.buffer;
    const originalName = filename || (file as Express.Multer.File).originalname;

    this.logger.log(`Parsing document: ${originalName} (${type})`);

    try {
      let content: string;
      let metadata: any = {
        extractedAt: new Date(),
        originalFilename: originalName,
      };

      switch (type) {
        case DocumentType.PDF:
          ({ content, metadata } = await this.parsePDF(buffer, metadata));
          break;
        case DocumentType.DOCUMENT:
          ({ content, metadata } = await this.parseDocument(buffer, metadata));
          break;
        case DocumentType.HTML:
          ({ content, metadata } = await this.parseHTML(buffer.toString('utf-8'), metadata));
          break;
        case DocumentType.MARKDOWN:
          ({ content, metadata } = await this.parseMarkdown(buffer.toString('utf-8'), metadata));
          break;
        case DocumentType.CSV:
          ({ content, metadata } = await this.parseCSV(buffer.toString('utf-8'), metadata));
          break;
        case DocumentType.JSON:
          ({ content, metadata } = await this.parseJSON(buffer.toString('utf-8'), metadata));
          break;
        case DocumentType.TEXT:
        default:
          content = buffer.toString('utf-8');
          break;
      }

      // Calculate content statistics
      const wordCount = this.countWords(content);
      const characterCount = content.length;
      const contentHash = this.generateContentHash(content);
      const language = await this.detectLanguage(content);

      const finalMetadata = {
        ...metadata,
        wordCount,
        characterCount,
        contentHash,
        language,
      };

      const totalDuration = Date.now() - startTime;

      // Record overall parsing metrics
      this.monitoring.recordMetric({
        name: 'document_parsing_total_duration',
        value: totalDuration,
        tags: {
          document_type: type,
          file_size: buffer.length.toString(),
          word_count: wordCount.toString()
        }
      });

      this.monitoring.recordMetric({
        name: 'document_parsing_success',
        value: 1,
        tags: {
          document_type: type,
          language,
          word_count: wordCount.toString()
        }
      });

      this.logger.log(
        `Document parsed successfully: ${wordCount} words, ${characterCount} characters in ${totalDuration}ms`
      );

      return {
        content: this.cleanContent(content),
        metadata: {
          ...finalMetadata,
          totalParsingDuration: totalDuration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      logSafeError(this.logger, error, `Failed to parse document: ${originalName}`);

      this.monitoring.recordMetric({
        name: 'document_parsing_error',
        value: 1,
        tags: {
          document_type: type,
          error_type: error instanceof Error ? error.constructor.name : 'Unknown',
          duration: duration.toString()
        }
      });

      throw new Error(`Document parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async parseURL(url: string): Promise<ParsedDocument> {
    const startTime = Date.now();
    this.logger.log(`Parsing URL: ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 30000,
          headers: {
            'User-Agent': 'SynapseAI Knowledge Scraper 1.0',
          },
        })
      );

      const contentType = response.headers['content-type'] || '';
      let type: DocumentType;

      if (contentType.includes('text/html')) {
        type = DocumentType.HTML;
      } else if (contentType.includes('application/json')) {
        type = DocumentType.JSON;
      } else if (contentType.includes('text/csv')) {
        type = DocumentType.CSV;
      } else {
        type = DocumentType.TEXT;
      }

      const buffer = Buffer.from(response.data);
      const result = await this.parseDocumentFile(buffer, type, url);

      const totalDuration = Date.now() - startTime;

      // Record URL parsing metrics
      this.monitoring.recordMetric({
        name: 'url_parsing_duration',
        value: totalDuration,
        tags: {
          content_type: contentType,
          status_code: response.status.toString(),
          content_length: buffer.length.toString()
        }
      });

      this.monitoring.recordMetric({
        name: 'url_parsing_success',
        value: 1,
        tags: {
          content_type: contentType,
          status_code: response.status.toString()
        }
      });

      // Add URL-specific metadata
      result.metadata = {
        ...result.metadata,
        sourceUrl: url,
        scrapedAt: new Date(),
        contentType,
        statusCode: response.status,
        urlParsingDuration: totalDuration,
      };

      this.logger.log(`URL parsed successfully: ${url} in ${totalDuration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logSafeError(this.logger, error, `Failed to parse URL: ${url}`);

      this.monitoring.recordMetric({
        name: 'url_parsing_error',
        value: 1,
        tags: {
          error_type: error instanceof Error ? error.constructor.name : 'Unknown',
          duration: duration.toString()
        }
      });

      throw new Error(`URL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parsePDF(
    buffer: Buffer,
    metadata: any
  ): Promise<{ content: string; metadata: any }> {
    try {
      const startTime = Date.now();

      // Parse PDF using pdf-parse library
      const pdfData = await pdfParse(buffer, {
        // Configuration options
        max: 0, // No page limit
        version: 'v1.10.100', // PDF.js version
      });

      const duration = Date.now() - startTime;

      // Record metrics
      this.monitoring.recordMetric({
        name: 'pdf_parsing_duration',
        value: duration,
        tags: {
          page_count: pdfData.numpages.toString(),
          file_size: buffer.length.toString()
        }
      });

      this.monitoring.recordMetric({
        name: 'pdf_parsing_success',
        value: 1,
        tags: {
          page_count: pdfData.numpages.toString(),
          text_length: pdfData.text.length.toString()
        }
      });

      this.logger.log(`PDF parsed successfully: ${pdfData.numpages} pages, ${pdfData.text.length} characters`);

      return {
        content: pdfData.text,
        metadata: {
          ...metadata,
          pageCount: pdfData.numpages,
          extractionMethod: 'pdf-parse',
          pdfInfo: {
            version: pdfData.version,
            creator: pdfData.info?.Creator,
            producer: pdfData.info?.Producer,
            creationDate: pdfData.info?.CreationDate,
            modificationDate: pdfData.info?.ModDate,
          },
          parsingDuration: duration,
        },
      };
    } catch (error) {
      logSafeError(this.logger, error, 'PDF parsing failed');

      this.monitoring.recordMetric({
        name: 'pdf_parsing_error',
        value: 1,
        tags: { error_type: error instanceof Error ? error.constructor.name : 'Unknown' }
      });

      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseDocument(
    buffer: Buffer,
    metadata: any
  ): Promise<{ content: string; metadata: any }> {
    try {
      const startTime = Date.now();

      // Parse document using mammoth library (supports DOCX, DOC)
      const result = await mammoth.extractRawText({ buffer });

      const duration = Date.now() - startTime;

      // Record metrics
      this.monitoring.recordMetric({
        name: 'document_parsing_duration',
        value: duration,
        tags: {
          file_size: buffer.length.toString(),
          text_length: result.value.length.toString()
        }
      });

      this.monitoring.recordMetric({
        name: 'document_parsing_success',
        value: 1,
        tags: {
          text_length: result.value.length.toString(),
          has_messages: result.messages.length > 0 ? 'true' : 'false'
        }
      });

      // Log warnings if any
      if (result.messages.length > 0) {
        this.logger.warn(`Document parsing warnings: ${result.messages.length} messages`, JSON.stringify({
          messages: result.messages.map((m: any) => m.message)
        }));
      }

      this.logger.log(`Document parsed successfully: ${result.value.length} characters`);

      return {
        content: result.value,
        metadata: {
          ...metadata,
          extractionMethod: 'mammoth',
          parsingDuration: duration,
          warnings: result.messages.map((m: any) => ({
            message: m.message,
            type: m.type,
          })),
        },
      };
    } catch (error) {
      logSafeError(this.logger, error, 'Document parsing failed');

      this.monitoring.recordMetric({
        name: 'document_parsing_error',
        value: 1,
        tags: { error_type: error instanceof Error ? error.constructor.name : 'Unknown' }
      });

      throw new Error(`Document parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseHTML(
    html: string,
    metadata: any
  ): Promise<{ content: string; metadata: any }> {
    try {
      const startTime = Date.now();

      // Parse HTML using cheerio
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script, style, nav, footer, header, aside, noscript').remove();

      // Extract metadata
      const title = $('title').first().text().trim();
      const description = $('meta[name="description"]').attr('content') || '';
      const author = $('meta[name="author"]').attr('content') || '';
      const keywords = $('meta[name="keywords"]').attr('content') || '';
      const ogTitle = $('meta[property="og:title"]').attr('content') || '';
      const ogDescription = $('meta[property="og:description"]').attr('content') || '';

      // Extract headings with hierarchy
      const headings: Array<{ level: number; text: string }> = [];
      $('h1, h2, h3, h4, h5, h6').each((_: any, element: any) => {
        const $el = $(element);
        const level = parseInt($el.prop('tagName').substring(1));
        const text = $el.text().trim();
        if (text) {
          headings.push({ level, text });
        }
      });

      // Extract links
      const links: Array<{ text: string; href: string }> = [];
      $('a[href]').each((_: any, element: any) => {
        const $el = $(element);
        const text = $el.text().trim();
        const href = $el.attr('href');
        if (text && href) {
          links.push({ text, href });
        }
      });

      // Extract images
      const images: Array<{ alt: string; src: string }> = [];
      $('img[src]').each((_: any, element: any) => {
        const $el = $(element);
        const alt = $el.attr('alt') || '';
        const src = $el.attr('src') || '';
        if (src) {
          images.push({ alt, src });
        }
      });

      // Extract main content (prioritize main, article, content areas)
      let mainContent = '';
      const mainSelectors = ['main', 'article', '[role="main"]', '.content', '#content', '.main-content'];

      for (const selector of mainSelectors) {
        const $main = $(selector);
        if ($main.length > 0) {
          mainContent = $main.text().trim();
          break;
        }
      }

      // Fallback to body if no main content found
      if (!mainContent) {
        mainContent = $('body').text().trim();
      }

      // Clean up content
      const content = mainContent
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      const duration = Date.now() - startTime;

      // Record metrics
      this.monitoring.recordMetric({
        name: 'html_parsing_duration',
        value: duration,
        tags: {
          html_length: html.length.toString(),
          content_length: content.length.toString()
        }
      });

      this.monitoring.recordMetric({
        name: 'html_parsing_success',
        value: 1,
        tags: {
          has_title: title ? 'true' : 'false',
          heading_count: headings.length.toString(),
          link_count: links.length.toString()
        }
      });

      this.logger.log(`HTML parsed successfully: ${content.length} characters, ${headings.length} headings`);

      return {
        content,
        metadata: {
          ...metadata,
          title: title || ogTitle,
          description: description || ogDescription,
          author,
          keywords: keywords ? keywords.split(',').map((k: string) => k.trim()) : [],
          headings,
          links: links.slice(0, 50), // Limit to first 50 links
          images: images.slice(0, 20), // Limit to first 20 images
          extractionMethod: 'cheerio',
          parsingDuration: duration,
          structure: {
            headingCount: headings.length,
            linkCount: links.length,
            imageCount: images.length,
          },
        },
      };
    } catch (error) {
      logSafeError(this.logger, error, 'HTML parsing failed');

      this.monitoring.recordMetric({
        name: 'html_parsing_error',
        value: 1,
        tags: { error_type: error instanceof Error ? error.constructor.name : 'Unknown' }
      });

      throw new Error(`HTML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseMarkdown(
    markdown: string,
    metadata: any
  ): Promise<{ content: string; metadata: any }> {
    // Extract title from first heading
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : undefined;

    // Extract all headings for structure
    const headingMatches = markdown.match(/^#{1,6}\s+.+$/gm) || [];
    const headings = headingMatches.map((h) => h.replace(/^#+\s+/, ''));

    // Remove markdown syntax for plain text content
    const content = markdown
      .replace(/^#{1,6}\s+/gm, '') // Remove heading markers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .replace(/^[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\d+\.\s+/gm, '') // Remove numbered list markers
      .replace(/\n{3,}/g, '\n\n'); // Normalize line breaks

    return {
      content: content.trim(),
      metadata: {
        ...metadata,
        title,
        headings,
        extractionMethod: 'markdown-parser',
      },
    };
  }

  private async parseCSV(csv: string, metadata: any): Promise<{ content: string; metadata: any }> {
    const lines = csv.split('\n').filter((line) => line.trim());
    const headers = lines[0] ? lines[0].split(',').map((h) => h.trim().replace(/"/g, '')) : [];
    const rowCount = lines.length - 1;

    // Convert CSV to readable text format
    let content = `CSV Data with ${headers.length} columns and ${rowCount} rows\n\n`;
    content += `Columns: ${headers.join(', ')}\n\n`;

    // Add sample rows for context
    const sampleRows = lines.slice(1, Math.min(6, lines.length));
    for (const row of sampleRows) {
      const values = row.split(',').map((v) => v.trim().replace(/"/g, ''));
      for (let i = 0; i < Math.min(headers.length, values.length); i++) {
        content += `${headers[i]}: ${values[i]}\n`;
      }
      content += '\n';
    }

    if (rowCount > 5) {
      content += `... and ${rowCount - 5} more rows`;
    }

    return {
      content,
      metadata: {
        ...metadata,
        columnCount: headers.length,
        rowCount,
        headers,
        extractionMethod: 'csv-parser',
      },
    };
  }

  private async parseJSON(
    json: string,
    metadata: any
  ): Promise<{ content: string; metadata: any }> {
    try {
      const data = JSON.parse(json);

      // Convert JSON to readable text format
      const content = this.jsonToText(data, 0);

      return {
        content,
        metadata: {
          ...metadata,
          jsonStructure: this.analyzeJsonStructure(data),
          extractionMethod: 'json-parser',
        },
      };
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private jsonToText(obj: any, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    let text = '';

    if (Array.isArray(obj)) {
      text += `Array with ${obj.length} items:\n`;
      obj.slice(0, 5).forEach((item, index) => {
        text += `${indent}${index + 1}. ${this.jsonToText(item, depth + 1)}\n`;
      });
      if (obj.length > 5) {
        text += `${indent}... and ${obj.length - 5} more items\n`;
      }
    } else if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);
      keys.slice(0, 10).forEach((key) => {
        const value = obj[key];
        if (typeof value === 'object') {
          text += `${indent}${key}: ${this.jsonToText(value, depth + 1)}\n`;
        } else {
          text += `${indent}${key}: ${String(value)}\n`;
        }
      });
      if (keys.length > 10) {
        text += `${indent}... and ${keys.length - 10} more properties\n`;
      }
    } else {
      text = String(obj);
    }

    return text;
  }

  private analyzeJsonStructure(obj: any): any {
    if (Array.isArray(obj)) {
      return {
        type: 'array',
        length: obj.length,
        itemTypes: [...new Set(obj.map((item) => typeof item))],
      };
    } else if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj);
      return {
        type: 'object',
        keyCount: keys.length,
        keys: keys.slice(0, 20), // Limit to first 20 keys
      };
    } else {
      return {
        type: typeof obj,
        value: obj,
      };
    }
  }

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  private generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async detectLanguage(content: string): Promise<string> {
    try {
      // Use franc library for real language detection
      const sample = content.substring(0, 10000); // Use more content for better accuracy

      if (sample.length < 10) {
        return 'unknown';
      }

      const detectedLanguage = franc(sample);
      const confidence = franc.all(sample);

      // Get the most confident language
      const bestMatch = confidence[0];
      const language = bestMatch && bestMatch[1] > 0.5 ? bestMatch[0] : 'unknown';

      // Record metrics
      this.monitoring.recordMetric({
        name: 'language_detection',
        value: 1,
        tags: {
          detected_language: language,
          confidence: bestMatch ? bestMatch[1].toString() : '0',
          content_length: content.length.toString()
        }
      });

      this.logger.debug(`Language detected: ${language} (confidence: ${bestMatch ? bestMatch[1] : 0})`);

      return language;
    } catch (error) {
      logSafeError(this.logger, error, 'Language detection failed');

      this.monitoring.recordMetric({
        name: 'language_detection_error',
        value: 1,
        tags: { error_type: error instanceof Error ? error.constructor.name : 'Unknown' }
      });

      // Fallback to simple detection
      const sample = content.toLowerCase().substring(0, 1000);
      const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      const englishCount = englishWords.reduce((count, word) => {
        return count + (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
      }, 0);

      return englishCount > 5 ? 'en' : 'unknown';
    }
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
  }

  async validateDocument(
    buffer: Buffer,
    filename: string
  ): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check file size (max 50MB)
    if (buffer.length > 50 * 1024 * 1024) {
      issues.push('File size exceeds 50MB limit');
    }

    // Check for empty files
    if (buffer.length === 0) {
      issues.push('File is empty');
    }

    // Check filename
    if (!filename || filename.length > 255) {
      issues.push('Invalid filename');
    }

    // Check for potentially malicious content
    const content = buffer.toString('utf-8', 0, Math.min(1000, buffer.length));
    if (content.includes('<script>') || content.includes('javascript:')) {
      issues.push('Potentially malicious content detected');
    }

    // Recommendations
    if (buffer.length > 10 * 1024 * 1024) {
      recommendations.push('Consider splitting large documents into smaller chunks');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }
}
