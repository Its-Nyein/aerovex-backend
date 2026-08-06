import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  UseGuards,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { UploadService } from '../services/upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { FileDto } from '../dtos/file.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { Permissions } from 'src/modules/auth/decorators/permissions.decorator';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiBody({
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
    required: true,
    description: 'File to upload',
    examples: {
      file: {
        value: {
          file: 'file.png',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    type: FileDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or file size is too large',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @Post('file-upload')
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Upload file' })
  @Permissions({ action: 'upload_image', subject: 'user' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 1024 * 1024 * 5,
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/jpg',
          'image/gif',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type'), false);
        }
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.uploadService.uploadFile(file);
    return {
      message: 'File uploaded successfully',
      data: result,
    };
  }

  @ApiResponse({
    status: 200,
    description: 'Secure url generated successfully',
    type: FileDto,
  })
  @ApiParam({
    name: 'key',
    type: String,
    example: 'file.png',
  })
  @ApiOperation({ summary: 'Get secure url' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions({ action: 'view', subject: 'user' })
  @Get('secure/:key')
  async getSecureUrl(@Param('key') key: string) {
    const result = await this.uploadService.generatePresignedUrl(key);
    return {
      message: 'Secure url generated successfully',
      data: result,
    };
  }

  @Delete('delete/:key')
  @ApiOperation({ summary: 'Delete file' })
  @ApiParam({
    name: 'key',
    type: String,
    example: 'file.png',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions({ action: 'delete', subject: 'user' })
  async deleteFile(@Param('key') key: string) {
    await this.uploadService.deleteFile(key);
    return {
      message: 'File deleted successfully',
    };
  }
}
