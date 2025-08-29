// Temporary stub for CsvImportService to fix build errors
export interface CsvImportResult {
  success: boolean
  totalRows: number
  successfulImports: number
  failedImports: number
  duplicatesFound: number
  errors: Array<{ row: number; message: string }>
}

export interface CsvValidationResult {
  errors: Array<{ row: number; message: string }>
  totalRows: number
  duplicatesFound: number
}

export class CsvImportService {
  static async importMedicalInstitutions(
    csvData: any,
    options: any
  ): Promise<CsvImportResult> {
    // Temporary implementation - return mock data
    return {
      success: false,
      totalRows: 0,
      successfulImports: 0,
      failedImports: 0,
      duplicatesFound: 0,
      errors: [{ row: 1, message: "CSV import not implemented yet" }],
    }
  }

  static async validateCsvData(csvData: any): Promise<CsvValidationResult> {
    // Temporary implementation - return mock data
    return {
      errors: [{ row: 1, message: "CSV validation not implemented yet" }],
      totalRows: 0,
      duplicatesFound: 0,
    }
  }

  static generateCsvTemplate() {
    throw new Error("CSV template generation not implemented yet")
  }
}
