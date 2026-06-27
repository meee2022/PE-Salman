// تصدير عنصر DOM إلى PDF مطابق للشاشة تمامًا (WYSIWYG) — يحفظ شكل الاستمارة الأصلي
// يستخدم html2canvas + jsPDF (تحميل ديناميكي لتقليل الحزمة).

export async function exportElementToPdf(el: HTMLElement, filename: string) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(el, {
    scale: 2,                  // دقة عالية
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    windowWidth: el.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 6;                        // هامش صغير
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;
  const usableH = pageH - margin * 2;

  let heightLeft = imgH;
  let position = margin;
  pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
  heightLeft -= usableH;

  // تقسيم على عدة صفحات إن كانت الاستمارة أطول من صفحة A4
  while (heightLeft > 0) {
    position = margin - (imgH - heightLeft);
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, position, imgW, imgH);
    heightLeft -= usableH;
  }

  pdf.save(`${filename}.pdf`);
}
