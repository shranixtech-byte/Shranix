import { Body, Controller, HttpCode, HttpStatus, Post, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

import { PdfService } from './pdf.service';

class GeneratePdfDto {
  @IsString()
  @MaxLength(2_000_000)
  html!: string;

  @IsOptional()
  @IsBoolean()
  landscape?: boolean;
}

@ApiTags('PDF')
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Render HTML → A4 PDF (server-side, Puppeteer)' })
  @ApiResponse({
    status: 200,
    description: 'PDF buffer returned',
    content: { 'application/pdf': {} },
  })
  async generate(@Body() dto: GeneratePdfDto): Promise<StreamableFile> {
    // Auth: global JwtAuthGuard se protected (bina @Public()) — Puppeteer CPU-heavy hai,
    // isliye sirf logged-in users hi render kar sakein (open abuse/DoS se bachao).
    // StreamableFile: Nest ka first-class binary response — raw Buffer return karne par
    // JSON.stringify(Buffer) ho jata hai (`{"type":"Buffer"...}`) aur PDF corrupt hota.
    const buffer = await this.pdfService.generatePdf(dto.html, { landscape: dto.landscape });
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: 'attachment; filename="invoice.pdf"',
    });
  }
}
