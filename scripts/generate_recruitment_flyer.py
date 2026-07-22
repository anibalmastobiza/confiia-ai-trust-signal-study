from __future__ import annotations

from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PDF = ROOT / "output/pdf/recruitment_flyer_confiia_ai_trust_signals_en.pdf"
LOGO_PATH = ROOT / "assets/ugr-logo.jpg"
STUDY_URL = "https://anibalmastobiza.github.io/confiia-ai-trust-signal-study/"

PAPER = colors.HexColor("#F5F2EA")
PANEL = colors.HexColor("#FFFDF8")
INK = colors.HexColor("#102D3F")
INK_DARK = colors.HexColor("#102A22")
INK_SOFT = colors.HexColor("#5B6B65")
CORAL = colors.HexColor("#E1634D")
AMBER = colors.HexColor("#F7BC49")
TEAL = colors.HexColor("#3E8F87")
LINE = colors.HexColor("#CAD0C8")
SHADOW = colors.Color(0.05, 0.12, 0.10, alpha=0.10)


def wrap_lines(text: str, font: str, size: float, max_width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if stringWidth(candidate, font, size) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    pdf: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    max_width: float,
    font: str,
    size: float,
    leading: float,
    colour: colors.Color,
) -> float:
    pdf.setFillColor(colour)
    pdf.setFont(font, size)
    for line in wrap_lines(text, font, size, max_width):
        pdf.drawString(x, y, line)
        y -= leading
    return y


def draw_qr(pdf: canvas.Canvas, value: str, x: float, y: float, size: float) -> None:
    qr = QrCodeWidget(value)
    qr.barFillColor = colors.black
    x1, y1, x2, y2 = qr.getBounds()
    scale = size / max(x2 - x1, y2 - y1)
    drawing = Drawing(size, size, transform=[scale, 0, 0, scale, -x1 * scale, -y1 * scale])
    drawing.add(qr)
    renderPDF.draw(drawing, pdf, x, y)


def draw_dot_cloud(
    pdf: canvas.Canvas,
    centre_x: float,
    centre_y: float,
    points: list[tuple[float, float]],
    colour: colors.Color,
) -> None:
    pdf.setFillColor(colour)
    for dx, dy in points:
        pdf.circle(centre_x + dx, centre_y + dy, 2.35, fill=1, stroke=0)


def draw_signal_trace(pdf: canvas.Canvas) -> None:
    pdf.setStrokeColor(TEAL)
    pdf.setLineWidth(2.4)
    trace = pdf.beginPath()
    trace.moveTo(408, 752)
    trace.lineTo(428, 752)
    trace.lineTo(437, 766)
    trace.lineTo(449, 733)
    trace.lineTo(461, 780)
    trace.lineTo(474, 742)
    trace.lineTo(485, 752)
    trace.lineTo(510, 752)
    pdf.drawPath(trace, fill=0, stroke=1)


def draw_step(
    pdf: canvas.Canvas,
    number: str,
    title: str,
    detail: str,
    centre_y: float,
) -> None:
    pdf.setFillColor(AMBER)
    pdf.circle(72, centre_y, 16.5, fill=1, stroke=0)
    pdf.setFillColor(INK_DARK)
    pdf.setFont("Helvetica-Bold", 8.8)
    pdf.drawCentredString(72, centre_y - 3, number)
    pdf.setFont("Helvetica-Bold", 11.5)
    pdf.drawString(99, centre_y + 3, title.upper())
    pdf.setFillColor(INK_SOFT)
    pdf.setFont("Helvetica", 9.2)
    pdf.drawString(99, centre_y - 12, detail)


def build_flyer() -> None:
    OUTPUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    width, height = A4
    pdf = canvas.Canvas(str(OUTPUT_PDF), pagesize=A4, pageCompression=1)
    pdf.setTitle("Recruitment flyer - CONFIIA Study 02")
    pdf.setSubject("Recruitment flyer for a five-minute online AI trust study")
    pdf.setAuthor("CONFIIA - Universidad de Granada")
    pdf.setCreator("ReportLab")

    pdf.setFillColor(PAPER)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)

    # Signature geometry: related to Study 01, but with behavioral-signal motifs.
    pdf.setFillColor(AMBER)
    pdf.circle(width + 8, height - 28, 111, fill=1, stroke=0)
    pdf.setFillColor(CORAL)
    pdf.circle(width - 63, height - 133, 18, fill=1, stroke=0)
    pdf.setFillColor(TEAL)
    pdf.circle(width - 110, height - 72, 8, fill=1, stroke=0)
    draw_signal_trace(pdf)

    pdf.setFillColor(INK_DARK)
    pdf.roundRect(38, 768, 208, 31, 15.5, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica", 10.4)
    pdf.drawString(54, 778, "ONLINE STUDY  ·  CONFIIA / 02")

    pdf.setFillColor(INK_DARK)
    pdf.setFont("Helvetica", 31.5)
    pdf.drawString(40, 704, "CAN YOUR BEHAVIOUR")
    pdf.drawString(40, 665, "REVEAL YOUR")
    pdf.setFillColor(CORAL)
    pdf.setFont("Helvetica", 49)
    pdf.drawString(40, 610, "TRUST IN AI?")

    draw_wrapped(
        pdf,
        "Take part in a five-minute study about how people make decisions with an imperfect AI adviser.",
        40,
        571,
        510,
        "Helvetica",
        13.8,
        19.5,
        INK_SOFT,
    )

    # A small visual echo of the dot-comparison task.
    cloud_a = [(-18, 10), (-8, 16), (4, 11), (16, 18), (-14, -2), (-2, 1), (11, 2), (20, -8), (-6, -13)]
    cloud_b = [(-18, 12), (-6, 16), (7, 14), (18, 8), (-16, -1), (-4, 2), (9, 2), (19, -7), (-10, -13), (4, -13), (14, -17)]
    draw_dot_cloud(pdf, 452, 547, cloud_a, TEAL)
    draw_dot_cloud(pdf, 515, 547, cloud_b, CORAL)

    pdf.setFillColor(INK_DARK)
    pdf.roundRect(34, 481, 527, 47, 12, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica", 15.3)
    pdf.drawCentredString(width / 2, 497.5, "5 MINUTES  ·  ANONYMOUS  ·  18+  ·  MOBILE OR DESKTOP")

    # Main information panel.
    pdf.setFillColor(SHADOW)
    pdf.roundRect(39, 37, 527, 430, 20, fill=1, stroke=0)
    pdf.setFillColor(PANEL)
    pdf.roundRect(34, 42, 527, 430, 20, fill=1, stroke=0)

    pdf.setFillColor(CORAL)
    pdf.setFont("Helvetica-Bold", 10.2)
    pdf.drawString(58, 438, "WHAT YOU WILL DO")
    pdf.setFillColor(INK_DARK)
    pdf.setFont("Helvetica", 20.5)
    pdf.drawString(58, 407, "Make six quick decisions with AI advice.")
    pdf.setFillColor(INK_SOFT)
    pdf.setFont("Helvetica", 11.2)
    pdf.drawString(58, 384, "There are no right or wrong opinions about the adviser.")

    # Universidad de Granada mark.
    pdf.setFillColor(colors.Color(1, 1, 1, alpha=0.92))
    pdf.roundRect(454, 374, 77, 79, 10, fill=1, stroke=0)
    logo = ImageReader(str(LOGO_PATH))
    logo_w, logo_h = logo.getSize()
    ratio = min(66 / logo_w, 68 / logo_h)
    draw_w, draw_h = logo_w * ratio, logo_h * ratio
    pdf.drawImage(
        logo,
        492.5 - draw_w / 2,
        413.5 - draw_h / 2,
        draw_w,
        draw_h,
        preserveAspectRatio=True,
        mask="auto",
    )

    draw_step(pdf, "01", "Decide", "Compare two dot clouds", 335)
    draw_step(pdf, "02", "Consult", "See the AI recommendation", 291)
    draw_step(pdf, "03", "Reflect", "Rate your confidence and trust", 247)

    # Privacy boundary, central to the recruitment message.
    pdf.setFillColor(colors.HexColor("#E8F2EF"))
    pdf.roundRect(55, 157, 300, 62, 11, fill=1, stroke=0)
    pdf.setFillColor(TEAL)
    pdf.setFont("Helvetica-Bold", 10.3)
    pdf.drawString(68, 198, "NO CAMERA. NO MICROPHONE.")
    draw_wrapped(
        pdf,
        "We store anonymous choices and interaction summaries - never your raw typed sentence.",
        68,
        181,
        274,
        "Helvetica",
        8.6,
        11,
        INK_SOFT,
    )

    # QR call to action.
    pdf.setFillColor(AMBER)
    pdf.roundRect(374, 145, 158, 205, 17, fill=1, stroke=0)
    pdf.setFillColor(INK_DARK)
    pdf.setFont("Helvetica-Bold", 11.2)
    pdf.drawCentredString(453, 327, "SCAN TO TAKE PART")
    pdf.setFillColor(colors.white)
    pdf.roundRect(389, 174, 128, 137, 10, fill=1, stroke=0)
    draw_qr(pdf, STUDY_URL, 398, 188, 110)
    pdf.setFillColor(INK_SOFT)
    pdf.setFont("Helvetica", 7.5)
    pdf.drawCentredString(453, 160, "Open on phone or computer")
    pdf.linkURL(STUDY_URL, (374, 145, 532, 350), relative=0)

    # Contact and participation note.
    pdf.setStrokeColor(LINE)
    pdf.setLineWidth(0.8)
    pdf.line(58, 129, 350, 129)
    pdf.setFillColor(INK_DARK)
    pdf.setFont("Helvetica", 8.8)
    pdf.drawString(58, 112, "CONTACT  ·  amastobiza@ugr.es")
    draw_wrapped(
        pdf,
        "Participation is voluntary. You may stop at any time. Research materials: CONFIIA, Universidad de Granada.",
        58,
        96,
        292,
        "Helvetica",
        7.5,
        10,
        INK_SOFT,
    )

    short_url = "anibalmastobiza.github.io/confiia-ai-trust-signal-study"
    pdf.setFillColor(INK_SOFT)
    pdf.setFont("Helvetica", 7.6)
    pdf.drawRightString(553, 21, short_url)
    pdf.linkURL(STUDY_URL, (335, 12, 556, 31), relative=0)

    pdf.showPage()
    pdf.save()


if __name__ == "__main__":
    build_flyer()
