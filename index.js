const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const markdownIt = require('markdown-it');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium')
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3003;

// Supabase init
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Health Check
app.get('/', (req, res) => {
    res.send('✅ Markdown to PDF Converter API is running.');
});

// Main Route
app.post('/generatePdf', async (req, res) => {
    const { markdown, logo = "https://tkhqppfqsitovjvsstfl.supabase.co/storage/v1/object/public/assets/netskillLogo.png" } = req.body;
    if (!markdown) {
        return res.status(400).json({ error: 'Markdown content is required' });
    }

  

    const fullHtml = `markdown
   
    try {
        // Launch puppeteer using chrome-aws-lambda
        const browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--font-render-hinting=medium',
                '--disable-skia-runtime-opts',
                '--disable-font-subpixel-positioning',
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '40px',
                bottom: '40px',
            },
        });

        await browser.close();

        // Upload to Supabase
        const bucketName = 'avatars';
        const fileName = `output-${Date.now()}.pdf`;

        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, pdfBuffer, {
                cacheControl: '3600',
                upsert: false,
                contentType: 'application/pdf',
            });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        res.status(200).json({
            message: '✅ PDF uploaded successfully',
            url: publicUrlData.publicUrl,
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: error.message || 'Failed to generate PDF' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
