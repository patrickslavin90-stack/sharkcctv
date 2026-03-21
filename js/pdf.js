// ── pdf.js — quote PDF export via jsPDF ──────────────────────
// Requires jsPDF loaded from CDN

const PDFExport = (() => {

  function generate(quote, items, labourHours, labourRate) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210, pageH = 297;
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 0;
    const blue = [41,171,226], dark = [17,20,24], grey = [100,120,140], light = [232,237,243], white = [255,255,255], green = [74,222,128];
    doc.setFillColor(...dark); doc.rect(0,0,pageW,42,'F');
    doc.setTextColor(...blue); doc.setFont('helvetica','bold'); doc.setFontSize(20);
    doc.text('SHARK CCTV',margin,16);
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...grey);
    doc.text('& SECURITY SOLUTIONS',margin,22);
    const right = pageW - margin;
    doc.setFontSize(8); doc.setTextColor(...light);
    doc.text(COMPANY.phone,right,12,{align:'right'});
    doc.text(COMPANY.email,right,17,{align:'right'});
    doc.text(COMPANY.website,right,22,{align:"right"});
    doc.setFillColor(...blue); doc.roundedRect(margin,27,52,10,2,2,'F');
    doc.setTextColor(...white); doc.setFont('helvetica','bold'); doc.setFontSize(11);
    doc.text(`QUOTE ${quote.quote_number}`,margin+26,33.5,{align:'center'});
    const sc = quote.status==='accepted'?green:quote.status==='sent'?blue:grey;
    doc.setFillColor(...sc); doc.roundedRect(margin+56,27,28,10,2,2,'F');
    doc.setTextColor(...white); doc.setFontSize(8);
    doc.text(quote.status.toUpperCase(),margin+70,33.5,{align:'center'});
    doc.setTextColor(...grey); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(`Date: ${new Date().toLocaleDateString('en-AU')}`,right,33,{align:'right'});
    y = 50;
    const colW = (contentW - 6) / 2;
    doc.setFillColor(24,28,34); doc.roundedRect(margin,y,colW,38,3,3,'F');
    doc.setTextColor(...blue); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text('CLIENT',margin+4,y+7);
    doc.setTextColor(...light); doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(quote.client_name||'-',margin+4,y+15);
    doc.setFontSize(8); doc.setTextColor(...grey);
    doc.text(quote.client_phone||'-',margin+4,y+21);
    doc.text(quote.client_email||'-',margin+4,y+27);
    const aX = margin + colW + 6;
    doc.setFillColor(24,28,34); doc.roundedRect(aX,y,colW,38,3,3,'F');
    doc.setTextColor(...blue); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text('INSTALL ADDRESS',aX+4,y+7);
    doc.setTextColor(...light); doc.setFont('helvetica','normal'); doc.setFontSize(9);
    const addr = [quote.street,quote.suburb,quote.state,quote.postcode].filter(Boolean).join(' ');
    doc.text(doc.splitTextToSize(addr||'-',colW-8),aX+4,y+15);
    y += 46;
    doc.setFillColor(...blue); doc.rect(margin,y,contentW,8,'F');
    doc.setTextColor(...white); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text('ITEM',margin+3,y+5.5);
    doc.text('QTY',margin+contentW-40,y+5.5,{align:'right'});
    doc.text('UNIT',margin+contentW-22,y+5.5,{align:'right'});
    doc.text('TOTAL',margin+contentW-2,y+5.5,{align:'right'});
    y += 8;
    let equipTotal = 0;
    items.forEach((item,i) => {
      const lt = item.price * item.qty; equipTotal += lt;
      doc.setFillColor(i%2===0?20:26,i%2===0?24:30,i%2===0?30:38); doc.rect(margin,y,contentW,8,'F');
      const sc = hexToRgbArr(item.color||'#29ABE2'); doc.setFillColor(...sc); doc.rect(margin,y,2.5,8,'F');
      doc.setTextColor(...light); doc.setFont('helvetica','normal'); doc.setFontSize(8);
      doc.text(item.name||'-',margin+5,y+5.5);
      doc.setTextColor(...grey); doc.text(String(item.qty), margin+contentW-40,y+5.5,{align:'right'});
      doc.text(`$${Number(item.price).toFixed(2)}`,margin+contentW-22,y+5.5,{align:'right'});
      doc.setFont('helvetica','bold'); doc.setTextColor(...light);
      doc.text(`$${lt.toFixed(2)}`,margin+contentW-2,y+5.5,{align:'right'});
      y += 8;
    });
    y += 4;
    const labour = labourHours*labourRate, gst = (equipTotal+labour)*0.1, grand = equipTotal+labour+gst;
    const tx = margin+contentW/2, tw = contentW/2;
    function row(l,v,hi=false) {
      if(hi){ doc.setFillColor(...blue); doc.roundedRect(tx,y,tw,10,2,2,'F'); doc.setTextColor(...white); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(l,tx+4,y+6.8); doc.text(v,tx+tw-4,y+6.8,{align:'right'}); y+=12; }
      else{ doc.setTextColor(...grey); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text(l,tx+4,y+5); doc.setTextColor(...light); doc.text(v,tx+tw-4,y+5,{align:"right"}); y+=7; }
    }
    row('Equipment',`$${equipTotal.toFixed(2)}`);
    row(`Labour (${labourHours}h @ $${labourRate}/hr)`,`$${labour.toFixed(2)}`);
    row('GST (10%)',`$${gst.toFixed(2)}`); y+=2;
    row('TOTAL (INC. GST)',`$${grand.toFixed(2)}`,true);
    y += 8;
    if(quote.notes){
      doc.setFillColor(24,28,34); doc.roundedRect(margin,y,contentW,6,2,2,'F');
      doc.setTextColor(...blue); doc.setFont('helvetica','bold'); doc.setFontSize(8);
      doc.text('NOTES & CONDITIONS',margin+4,y+4.2); y+=8;
      doc.setTextColor(...grey); doc.setFont('helvetica','normal'); doc.setFontSize(8);
      const nl = doc.splitTextToSize(quote.notes,contentW-4); doc.text(nl,margin+2,y);
    }
    doc.setFillColor(...dark); doc.rect(0,pageH-13,pageW,13,'F');
    doc.setTextColor(...grey); doc.setFontSize(7.5);
    doc.text(`${COMPANY.name} | ${COMPANY.phone} | ${COMPANY.email} | ${COMPANY.website}`,pageW/2,pageH-5.5,{align:'center'});
    const fn = `Shark-Quote-${quote.quote_number}.pdf`; doc.save(fn); return fn;
  }

  function hexToRgbArr(x) {
    x=x.replace('#','');
    if(x.length===3) x=x.split('').map(c=>c+c).join('');
    return [parseInt(x.slice(0,2),16),parseInt(x.slice(2,4),16),parseInt(x.slice(4,6),16)];
  }

  return { generate };
 })();
