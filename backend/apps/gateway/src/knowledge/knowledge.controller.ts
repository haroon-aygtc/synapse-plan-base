import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '@shared/decorators/roles.decorator';
import { UserRole } from '@shared/enums';
import { KnowledgeService } from './knowledge.service';
import { SecurityContext } from './knowledge-security.service';
import { CreateDocumentDto, UpdateDocumentDto, SearchDocumentsDto } from './dto';

@ApiTags('knowledge')
@Controller('knowledge')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post('/documents')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new document' })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  async createDocument(
    @Request() req: any,
    @Body(ValidationPipe) createDocumentDto: CreateDocumentDto
  ) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.createDocument(createDocumentDto, context);
  }

  @Post('/documents/upload')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document file' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadDocument(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title: string,
    @Body('tags') tags: string = '',
    @Body('metadata') metadata: string = '',
    @Body('visibility') visibility: string = 'private'
  ) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.uploadDocument(
      file,
      {
        title,
        tags: tags ? JSON.parse(tags) : undefined,
        metadata: metadata ? JSON.parse(metadata) : undefined,
        visibility: visibility as any,
      },
      context
    );
  }

  @Post('/documents/bulk-upload')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk upload documents' })
  @ApiResponse({ status: 201, description: 'Documents uploaded successfully' })
  async bulkUploadDocuments(
    @Request() req: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('metadata') metadata: string
  ) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    const parsedMetadata = JSON.parse(metadata);
    return this.knowledgeService.bulkUploadDocuments(files, parsedMetadata, context);
  }

  @Get('/documents')
  @ApiOperation({ summary: 'List all documents' })
  @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
  async listDocuments(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('tags') tags?: string
  ) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.listDocuments(
      {
        page,
        limit,
        search,
        type,
        status,
        tags: tags ? tags.split(',') : undefined,
      },
      context
    );
  }

  @Get('/documents/:id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
  async getDocument(@Param('id') id: string, @Request() req: any) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.getDocument(id, context);
  }

  @Put('/documents/:id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update document' })
  @ApiResponse({ status: 200, description: 'Document updated successfully' })
  async updateDocument(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDocumentDto: UpdateDocumentDto,
    @Request() req: any
  ) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.updateDocument(id, updateDocumentDto, context);
  }

  @Delete('/documents/:id')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete document' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  async deleteDocument(@Param('id') id: string, @Request() req: any) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.deleteDocument(id, context);
  }

  @Post('/search')
  @ApiOperation({ summary: 'Search knowledge base' })
  @ApiResponse({ status: 200, description: 'Search completed successfully' })
  async searchDocuments(@Body(ValidationPipe) searchDto: SearchDocumentsDto, @Request() req: any) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.searchDocuments(searchDto, context);
  }

  @Get('/search/history')
  @ApiOperation({ summary: 'Get search history' })
  @ApiResponse({
    status: 200,
    description: 'Search history retrieved successfully',
  })
  async getSearchHistory(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('userId') userId?: string
  ) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.getSearchHistory({ page, limit, userId }, context);
  }

  @Get('/search/:id')
  @ApiOperation({ summary: 'Get search by ID' })
  @ApiResponse({ status: 200, description: 'Search retrieved successfully' })
  async getSearch(@Param('id') id: string, @Request() req: any) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.getSearch(id, context);
  }

  @Post('/documents/:id/reprocess')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reprocess document' })
  @ApiResponse({ status: 200, description: 'Document reprocessing started' })
  async reprocessDocument(@Param('id') id: string, @Request() req: any) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.reprocessDocument(id, context);
  }

  @Get('/documents/:id/status')
  @ApiOperation({ summary: 'Get document processing status' })
  @ApiResponse({
    status: 200,
    description: 'Processing status retrieved successfully',
  })
  async getProcessingStatus(@Param('id') id: string, @Request() req: any) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.getProcessingStatus(id, context);
  }

  @Get('/documents/:id/similar')
  @ApiOperation({ summary: 'Get similar documents' })
  @ApiResponse({
    status: 200,
    description: 'Similar documents retrieved successfully',
  })
  async getSimilarDocuments(
    @Param('id') id: string,
    @Query('maxResults') maxResults: number = 5,
    @Query('threshold') threshold: number = 0.8,
    @Request() req: any
  ) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.getSimilarDocuments(
      id,
      {
        maxResults,
        threshold,
      },
      context
    );
  }

  @Get('/analytics')
  @ApiOperation({ summary: 'Get knowledge analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(
    @Query('start') start: string,
    @Query('end') end: string,
    @Request() req: any
  ) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.getAnalytics(
      {
        start: new Date(start),
        end: new Date(end),
      },
      context
    );
  }

  @Post('/collections')
  @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create document collection' })
  @ApiResponse({ status: 201, description: 'Collection created successfully' })
  async createCollection(@Body() collectionData: any, @Request() req: any) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.createCollection(collectionData, context);
  }

  @Post('/collections/:id/search')
  @ApiOperation({ summary: 'Search within collection' })
  @ApiResponse({
    status: 200,
    description: 'Collection search completed successfully',
  })
  async searchCollection(
    @Param('id') collectionId: string,
    @Body(ValidationPipe) searchDto: SearchDocumentsDto,
    @Request() req: any
  ) {
    const context: SecurityContext = {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      role: req.user.role,
    };
    return this.knowledgeService.searchCollection(collectionId, searchDto, context);
  }
}
