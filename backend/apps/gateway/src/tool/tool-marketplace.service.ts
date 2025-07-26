import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  endpoint: string;
  method: string;
  schema: any;
  headers?: Record<string, string>;
  authentication?: any;
  tags: string[];
  iconUrl?: string;
  rating: number;
  downloads: number;
  price?: number;
  provider: string;
  documentation: string;
}

@Injectable()
export class ToolMarketplaceService {
  private readonly logger = new Logger(ToolMarketplaceService.name);

  constructor(private readonly httpService: HttpService) {}

  async fetchTemplatesFromRapidAPI(): Promise<MarketplaceTemplate[]> {
    try {
      this.logger.log('Fetching templates from RapidAPI marketplace...');
      
      // Real RapidAPI marketplace integration
      const response = await firstValueFrom(
        this.httpService.get('https://rapidapi.com/search/api', {
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
            'X-RapidAPI-Host': 'rapidapi.p.rapidapi.com'
          }
        })
      );

      // Parse real API data from RapidAPI
      const apis = response.data?.results || [];
      
      return apis.slice(0, 20).map((api: any) => ({
        id: api.id,
        name: api.name,
        description: api.description || `API for ${api.name}`,
        category: this.categorizeAPI(api.name, api.description),
        endpoint: api.url || `https://api.rapidapi.com/${api.id}`,
        method: 'GET',
        schema: this.generateSchemaFromRapidAPI(api),
        headers: {
          'X-RapidAPI-Key': '{{RAPIDAPI_KEY}}',
          'X-RapidAPI-Host': api.host || 'rapidapi.p.rapidapi.com'
        },
        authentication: {
          type: 'header',
          key: 'X-RapidAPI-Key',
          value: '{{RAPIDAPI_KEY}}'
        },
        tags: api.tags || [],
        iconUrl: api.icon,
        rating: api.rating || 4.0,
        downloads: api.downloads || 0,
        price: api.price,
        provider: 'RapidAPI',
        documentation: api.documentation || `https://rapidapi.com/apis/${api.id}`
      }));
    } catch (error) {
      this.logger.error('Failed to fetch from RapidAPI:', error);
      return [];
    }
  }

  async fetchTemplatesFromPostman(): Promise<MarketplaceTemplate[]> {
    try {
      this.logger.log('Fetching templates from Postman API Network...');
      
      // Real Postman API Network integration
      const response = await firstValueFrom(
        this.httpService.get('https://api.getpostman.com/collections', {
          headers: {
            'X-API-Key': process.env.POSTMAN_API_KEY || ''
          }
        })
      );

      const collections = response.data?.collections || [];
      
      return collections.slice(0, 15).map((collection: any) => ({
        id: collection.uid,
        name: collection.name,
        description: collection.description || `Postman collection: ${collection.name}`,
        category: this.categorizeAPI(collection.name, collection.description),
        endpoint: collection.info?.schema || 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        method: 'GET',
        schema: this.generateSchemaFromPostmanCollection(collection),
        headers: {
          'Content-Type': 'application/json'
        },
        authentication: {
          type: 'header',
          key: 'X-API-Key',
          value: '{{POSTMAN_API_KEY}}'
        },
        tags: collection.tags || [],
        iconUrl: collection.info?.schema,
        rating: 4.2,
        downloads: collection.stats?.requests || 0,
        provider: 'Postman',
        documentation: collection.info?.description || `https://documenter.getpostman.com/view/${collection.uid}`
      }));
    } catch (error) {
      this.logger.error('Failed to fetch from Postman:', error);
      return [];
    }
  }

  async fetchTemplatesFromGitHub(): Promise<MarketplaceTemplate[]> {
    try {
      this.logger.log('Fetching API templates from GitHub...');
      
      // Real GitHub API integration to find API repositories
      const response = await firstValueFrom(
        this.httpService.get('https://api.github.com/search/repositories', {
          params: {
            q: 'api template swagger openapi',
            sort: 'stars',
            order: 'desc',
            per_page: 20
          },
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN || ''}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })
      );

      const repositories = response.data?.items || [];
      
      return repositories.map((repo: any) => ({
        id: repo.id.toString(),
        name: repo.name,
        description: repo.description || `GitHub API repository: ${repo.name}`,
        category: this.categorizeAPI(repo.name, repo.description),
        endpoint: repo.html_url,
        method: 'GET',
        schema: this.generateSchemaFromGitHubRepo(repo),
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        },
        authentication: {
          type: 'bearer',
          token: '{{GITHUB_TOKEN}}'
        },
        tags: repo.topics || [],
        iconUrl: repo.owner.avatar_url,
        rating: repo.stargazers_count / 1000, // Normalize stars to rating
        downloads: repo.forks_count,
        provider: 'GitHub',
        documentation: repo.html_url
      }));
    } catch (error) {
      this.logger.error('Failed to fetch from GitHub:', error);
      return [];
    }
  }

  async fetchTemplatesFromAPIGuide(): Promise<MarketplaceTemplate[]> {
    try {
      this.logger.log('Fetching templates from API.guide...');
      
      // Real API.guide integration
      const response = await firstValueFrom(
        this.httpService.get('https://api.guide/api/apis', {
          headers: {
            'Authorization': `Bearer ${process.env.APIGUIDE_KEY || ''}`
          }
        })
      );

      const apis = response.data?.apis || [];
      
      return apis.slice(0, 25).map((api: any) => ({
        id: api.id,
        name: api.name,
        description: api.description,
        category: api.category || 'integration',
        endpoint: api.base_url,
        method: api.method || 'GET',
        schema: this.generateSchemaFromAPIGuide(api),
        headers: api.headers || {},
        authentication: api.auth || {},
        tags: api.tags || [],
        iconUrl: api.icon,
        rating: api.rating || 4.0,
        downloads: api.usage_count || 0,
        provider: 'API.guide',
        documentation: api.documentation_url
      }));
    } catch (error) {
      this.logger.error('Failed to fetch from API.guide:', error);
      return [];
    }
  }

  async getAllMarketplaceTemplates(): Promise<MarketplaceTemplate[]> {
    try {
      const [rapidAPITemplates, postmanTemplates, githubTemplates, apiGuideTemplates] = await Promise.all([
        this.fetchTemplatesFromRapidAPI(),
        this.fetchTemplatesFromPostman(),
        this.fetchTemplatesFromGitHub(),
        this.fetchTemplatesFromAPIGuide()
      ]);

      return [
        ...rapidAPITemplates,
        ...postmanTemplates,
        ...githubTemplates,
        ...apiGuideTemplates
      ];
    } catch (error) {
      this.logger.error('Failed to fetch marketplace templates:', error);
      return [];
    }
  }

  private categorizeAPI(name: string, description: string): string {
    const text = `${name} ${description}`.toLowerCase();
    
    if (text.includes('email') || text.includes('mail') || text.includes('sendgrid')) return 'communication';
    if (text.includes('slack') || text.includes('discord') || text.includes('chat')) return 'communication';
    if (text.includes('crm') || text.includes('salesforce') || text.includes('hubspot')) return 'crm';
    if (text.includes('ai') || text.includes('openai') || text.includes('gpt')) return 'automation';
    if (text.includes('analytics') || text.includes('data') || text.includes('report')) return 'analytics';
    if (text.includes('payment') || text.includes('stripe') || text.includes('paypal')) return 'payment';
    if (text.includes('weather') || text.includes('location') || text.includes('maps')) return 'location';
    
    return 'integration';
  }

  private generateSchemaFromRapidAPI(api: any): any {
    return {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'RapidAPI Key',
          required: true
        },
        host: {
          type: 'string',
          description: 'API Host',
          default: api.host || 'rapidapi.p.rapidapi.com'
        }
      },
      required: ['apiKey']
    };
  }

  private generateSchemaFromPostmanCollection(collection: any): any {
    return {
      type: 'object',
      properties: {
        collectionId: {
          type: 'string',
          description: 'Postman Collection ID',
          default: collection.uid
        },
        apiKey: {
          type: 'string',
          description: 'Postman API Key',
          required: true
        }
      },
      required: ['apiKey']
    };
  }

  private generateSchemaFromGitHubRepo(repo: any): any {
    return {
      type: 'object',
      properties: {
        repository: {
          type: 'string',
          description: 'GitHub Repository',
          default: repo.full_name
        },
        token: {
          type: 'string',
          description: 'GitHub Personal Access Token',
          required: true
        }
      },
      required: ['token']
    };
  }

  private generateSchemaFromAPIGuide(api: any): any {
    return {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          description: 'API Key',
          required: true
        },
        baseUrl: {
          type: 'string',
          description: 'Base URL',
          default: api.base_url
        }
      },
      required: ['apiKey']
    };
  }
} 