import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DocumentType } from '@database/entities';
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';

// Note: In production, install cheerio: npm install cheerio @types/cheerio
// For now, using a mock implementation
const cheerio = {
  load: (html: string) => ({
    text: () => html.replace(/<[^>]*>/g, '').trim(),
    remove: () => ({}),
    first: () => ({ text: () => '', length: 0 }),
    attr: () => undefined,
    each: () => ({}),
  }),
};

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
  private readonly logger = new Logger(DocumentParsingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {}

  async parseDocument(
    file: Express.Multer.File | Buffer,
    type: DocumentType,
    filename?: string
  ): Promise<ParsedDocument> {
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

      this.logger.log(
        `Document parsed successfully: ${wordCount} words, ${characterCount} characters`
      );

      return {
        content: this.cleanContent(content),
        metadata: finalMetadata,
      };
    } catch (error) {
      this.logger.error(`Failed to parse document: ${originalName}`, error);
      throw new Error(`Document parsing failed: ${error.message}`);
    }
  }

  async parseURL(url: string): Promise<ParsedDocument> {
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
      const result = await this.parseDocument(buffer, type, url);

      // Add URL-specific metadata
      result.metadata = {
        ...result.metadata,
        sourceUrl: url,
        scrapedAt: new Date(),
        contentType,
        statusCode: response.status,
      };

      return result;
    } catch (error) {
      this.logger.error(`Failed to parse URL: ${url}`, error);
      throw new Error(`URL parsing failed: ${error.message}`);
    }
  }

  private async parsePDF(
    buffer: Buffer,
    metadata: any
  ): Promise<{ content: string; metadata: any }> {
    // In production, use a proper PDF parsing library like pdf-parse or pdf2pic
    // For now, return placeholder implementation
    this.logger.warn('PDF parsing not fully implemented - using placeholder');

    return {
      content: 'PDF content extraction not implemented. Please use a proper PDF parsing library.',
      metadata: {
        ...metadata,
        pageCount: 1,
        extractionMethod: 'placeholder',
      },
    };
  }

  private async parseDocument(
    buffer: Buffer,
    metadata: any
  ): Promise<{ content: string; metadata: any }> {
    // In production, use a proper document parsing library like mammoth for DOCX
    this.logger.warn('Document parsing not fully implemented - using placeholder');

    return {
      content:
        'Document content extraction not implemented. Please use a proper document parsing library.',
      metadata: {
        ...metadata,
        extractionMethod: 'placeholder',
      },
    };
  }

  private async parseHTML(
    html: string,
    metadata: any
  ): Promise<{ content: string; metadata: any }> {
    const $ = cheerio.load(html);

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim();

    // Extract meta information
    const description = $('meta[name="description"]').attr('content');
    const author = $('meta[name="author"]').attr('content');
    const keywords = $('meta[name="keywords"]').attr('content');

    // Remove script and style elements
    $('script, style, nav, footer, header, aside').remove();

    // Extract main content
    let content = '';
    const mainContent = $('main, article, .content, #content').first();
    if (mainContent.length > 0) {
      content = mainContent.text();
    } else {
      content = $('body').text();
    }

    // Extract headings for structure
    const headings: string[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      headings.push($(el).text().trim());
    });

    return {
      content: content.replace(/\s+/g, ' ').trim(),
      metadata: {
        ...metadata,
        title,
        description,
        author,
        keywords: keywords ? keywords.split(',').map((k) => k.trim()) : [],
        headings,
        extractionMethod: 'cheerio',
      },
    };
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
      throw new Error(`Invalid JSON format: ${error.message}`);
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
    // Simple language detection based on common words
    // In production, use a proper language detection library
    const sample = content.toLowerCase().substring(0, 1000);

    const englishWords = [
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ];
    const englishCount = englishWords.reduce((count, word) => {
      return count + (sample.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
    }, 0);

    // Simple heuristic - if we find many English words, assume English
    if (englishCount > 5) {
      return 'en';
    }

    return 'unknown';
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
