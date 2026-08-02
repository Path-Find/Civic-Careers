declare module 'pdf-parse' {
  interface PDFData {
    text: string;
  }

  function pdfParse(data: Buffer): Promise<PDFData>;
  export default pdfParse;
}
