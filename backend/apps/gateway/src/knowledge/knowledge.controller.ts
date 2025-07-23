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
  } from '@nestjs/common';
  import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
  import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '@shared/decorators/roles.decorator';
  import { UserRole } from '@shared/enums';
  import { KnowledgeService } from './knowledge.service';
  import {
    CreateDocumentDto,
    UpdateDocumentDto,
    SearchDocumentsDto,
  } from './dto';
  
  @ApiTags('knowledge')
  @Controller('knowledge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class KnowledgeController {
    constructor(private readonly knowledgeService: KnowledgeService) {}
  
    @Post('/documents')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Create a new document' })
    @ApiResponse({ status: 201, description: 'Document created successfully' })
    async createDocument(@Body(ValidationPipe) createDocumentDto: CreateDocumentDto) {
      return this.knowledgeService.createDocument(createDocumentDto);
    }
  
    @Post('/documents/upload')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload a document file' })
    @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
    async uploadDocument(
      @UploadedFile() file: Express.Multer.File,
      @Body('title') title: string,
      @Body('tags') tags?: string,
      @Body('metadata') metadata?: string,
    ) {
      return this.knowledgeService.uploadDocument(file, {
        title,
        tags: tags ? JSON.parse(tags) : undefined,
        metadata: metadata ? JSON.parse(metadata) : undefined,
      });
    }
  
    @Post('/documents/bulk-upload')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @UseInterceptors(FilesInterceptor('files', 10))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Bulk upload documents' })
    @ApiResponse({ status: 201, description: 'Documents uploaded successfully' })
    async bulkUploadDocuments(
      @UploadedFiles() files: Express.Multer.File[],
      @Body('metadata') metadata: string,
    ) {
      const parsedMetadata = JSON.parse(metadata);
      return this.knowledgeService.bulkUploadDocuments(files, parsedMetadata);
    }
  
    @Get('/documents')
    @ApiOperation({ summary: 'List all documents' })
    @ApiResponse({ status: 200, description: 'Documents retrieved successfully' })
    async listDocuments(
      @Query('page') page: number = 1,
      @Query('limit') limit: number = 20,
      @Query('search') search?: string,
      @Query('type') type?: string,
      @Query('status') status?: string,
      @Query('tags') tags?: string,
    ) {
      return this.knowledgeService.listDocuments({
        page,
        limit,
        search,
        type,
        status,
        tags: tags ? tags.split(',') : undefined,
      });
    }
  
    @Get('/documents/:id')
    @ApiOperation({ summary: 'Get document by ID' })
    @ApiResponse({ status: 200, description: 'Document retrieved successfully' })
    async getDocument(@Param('id') id: string) {
      return this.knowledgeService.getDocument(id);
    }
  
    @Put('/documents/:id')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Update document' })
    @ApiResponse({ status: 200, description: 'Document updated successfully' })
    async updateDocument(
      @Param('id') id: string,
      @Body(ValidationPipe) updateDocumentDto: UpdateDocumentDto,
    ) {
      return this.knowledgeService.updateDocument(id, updateDocumentDto);
    }
  
    @Delete('/documents/:id')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Delete document' })
    @ApiResponse({ status: 200, description: 'Document deleted successfully' })
    async deleteDocument(@Param('id') id: string) {
      return this.knowledgeService.deleteDocument(id);
    }
  
    @Post('/search')
    @ApiOperation({ summary: 'Search knowledge base' })
    @ApiResponse({ status: 200, description: 'Search completed successfully' })
    async searchDocuments(@Body(ValidationPipe) searchDto: SearchDocumentsDto) {
      return this.knowledgeService.searchDocuments(searchDto);
    }
  
    @Get('/search/history')
    @ApiOperation({ summary: 'Get search history' })
    @ApiResponse({ status: 200, description: 'Search history retrieved successfully' })
    async getSearchHistory(
      @Query('page') page: number = 1,
      @Query('limit') limit: number = 20,
      @Query('userId') userId?: string,
    ) {
      return this.knowledgeService.getSearchHistory({ page, limit, userId });
    }
  
    @Get('/search/:id')
    @ApiOperation({ summary: 'Get search by ID' })
    @ApiResponse({ status: 200, description: 'Search retrieved successfully' })
    async getSearch(@Param('id') id: string) {
      return this.knowledgeService.getSearch(id);
    }
  
    @Post('/documents/:id/reprocess')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Reprocess document' })
    @ApiResponse({ status: 200, description: 'Document reprocessing started' })
    async reprocessDocument(@Param('id') id: string) {
      return this.knowledgeService.reprocessDocument(id);
    }
  
    @Get('/documents/:id/status')
    @ApiOperation({ summary: 'Get document processing status' })
    @ApiResponse({ status: 200, description: 'Processing status retrieved successfully' })
    async getProcessingStatus(@Param('id') id: string) {
      return this.knowledgeService.getProcessingStatus(id);
    }
  
    @Get('/documents/:id/similar')
    @ApiOperation({ summary: 'Get similar documents' })
    @ApiResponse({ status: 200, description: 'Similar documents retrieved successfully' })
    async getSimilarDocuments(
      @Param('id') id: string,
      @Query('maxResults') maxResults: number = 5,
      @Query('threshold') threshold: number = 0.8,
    ) {
      return this.knowledgeService.getSimilarDocuments(id, {
        maxResults,
        threshold,
      });
    }
  
    @Get('/analytics')
    @ApiOperation({ summary: 'Get knowledge analytics' })
    @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
    async getAnalytics(
      @Query('start') start: string,
      @Query('end') end: string,
    ) {
      return this.knowledgeService.getAnalytics({
        start: new Date(start),
        end: new Date(end),
      });
    }
  
    @Post('/collections')
    @Roles(UserRole.DEVELOPER, UserRole.ORG_ADMIN, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Create document collection' })
    @ApiResponse({ status: 201, description: 'Collection created successfully' })
    async createCollection(@Body() collectionData: any) {
      return this.knowledgeService.createCollection(collectionData);
    }
  
    @Post('/collections/:id/search')
    @ApiOperation({ summary: 'Search within collection' })
    @ApiResponse({ status: 200, description: 'Collection search completed successfully' })
    async searchCollection(
      @Param('id') collectionId: string,
      @Body(ValidationPipe) searchDto: SearchDocumentsDto,
    ) {
      return this.knowledgeService.searchCollection(collectionId, searchDto);
    }
  }
  