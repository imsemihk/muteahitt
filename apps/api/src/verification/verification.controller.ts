import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { IndividualVerificationDto } from './dto/individual-verification.dto';
import { CompanyVerificationDto } from './dto/company-verification.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Verification')
@Controller('verification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Doğrulama durumu ve belgeler' })
  getStatus(@CurrentUser('id') userId: string) {
    return this.verificationService.getStatus(userId);
  }

  @Post('individual')
  @ApiOperation({ summary: 'Bireysel kimlik bilgilerini gönder (TC şifreli saklanır)' })
  submitIndividual(
    @CurrentUser('id') userId: string,
    @Body() dto: IndividualVerificationDto,
  ) {
    return this.verificationService.submitIndividual(userId, dto);
  }

  @Post('company')
  @ApiOperation({ summary: 'Şirket bilgilerini gönder' })
  submitCompany(
    @CurrentUser('id') userId: string,
    @Body() dto: CompanyVerificationDto,
  ) {
    return this.verificationService.submitCompany(userId, dto);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Doğrulama belgesi kaydet (R2\'ye yüklendi, burada DB kaydı)' })
  uploadDocument(
    @CurrentUser('id') userId: string,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.verificationService.uploadDocument(userId, dto);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Belge sil (sadece incelenmemişler)' })
  deleteDocument(
    @CurrentUser('id') userId: string,
    @Param('id') documentId: string,
  ) {
    return this.verificationService.deleteDocument(userId, documentId);
  }
}
