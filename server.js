const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// Debug: Check environment variables
console.log('🔧 Environment Check:');
console.log('- OpenAI API Key:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- Anthropic API Key:', process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- Port:', PORT);

// Security and optimization middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline styles for React
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50 // limit each IP to 50 requests per windowMs
});
app.use('/api/', limiter);

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize AI clients
console.log('🤖 Initializing AI clients...');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
console.log('- OpenAI client initialized');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
console.log('- Anthropic client initialized');

// Helper function to convert image to base64
function imageToBase64(filePath) {
  const imageBuffer = fs.readFileSync(filePath);
  return imageBuffer.toString('base64');
}

// Helper function to get file extension
function getFileExtension(filename) {
  const ext = path.extname(filename).toLowerCase().slice(1);
  // If no extension found, default to 'jpeg' for images
  return ext || 'jpeg';
}

// LLM API call functions
async function callOpenAI(imagePath, prompt) {
  console.log('🔴 OpenAI: Starting API call...');
  console.log('- Model: o4-mini');
  console.log('- Image path:', imagePath);
  console.log('- Prompt:', prompt || 'Default prompt');
  
  try {
    const base64Image = imageToBase64(imagePath);
    console.log('- Image converted to base64, length:', base64Image.length);
    
    const response = await openai.chat.completions.create({
      model: "o4-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt || "Analyze this image and answer any questions you see. For multiple choice questions, respond with ONLY the correct option letter (A, B, C, or D). For math questions, respond with ONLY the correct numerical answer. Do not provide any explanations, reasoning, or additional text."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: {
        type: "text"
      },
      reasoning_effort: "high"
    });
    
    console.log('🔴 OpenAI: Response received');
    console.log('- Response:', response.choices[0].message.content);
    
    return {
      success: true,
      response: response.choices[0].message.content,
      model: "o4-mini"
    };
  } catch (error) {
    console.error('🔴 OpenAI: ERROR -', error.message);
    console.error('- Full error:', error);
    return {
      success: false,
      error: error.message,
      model: "o4-mini"
    };
  }
}

// NEW: Batch processing function for OpenAI
async function callOpenAIBatch(imagePaths, filenames, prompt) {
  console.log('🔴 OpenAI Batch: Starting API call...');
  console.log('- Model: o4-mini');
  console.log('- Image count:', imagePaths.length);
  console.log('- Prompt:', prompt || 'Default prompt');
  
  try {
    const content = [
      {
        type: "text",
        text: prompt || `I'm sending you ${imagePaths.length} images with questions. Please analyze each image and provide answers. 

IMPORTANT: Format your response as follows:
Image ${filenames[0]}: [answer]
Image ${filenames[1]}: [answer]
${filenames.length > 2 ? `Image ${filenames[2]}: [answer]` : ''}
${filenames.length > 3 ? `Image ${filenames[3]}: [answer]` : ''}
${filenames.length > 4 ? `Image ${filenames[4]}: [answer]` : ''}

For multiple choice questions, respond with ONLY the correct option letter (A, B, C, or D). 
For math questions, respond with ONLY the correct numerical answer. 
Do not provide explanations, reasoning, or additional text beyond the answers.`
      }
    ];

    // Add all images to the content array
    imagePaths.forEach((imagePath, index) => {
      const base64Image = imageToBase64(imagePath);
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`
        }
      });
    });

    const response = await openai.chat.completions.create({
      model: "o4-mini",
      messages: [
        {
          role: "user",
          content: content
        }
      ],
      response_format: {
        type: "text"
      },
      reasoning_effort: "high"
    });
    
    console.log('🔴 OpenAI Batch: Response received');
    console.log('- Response:', response.choices[0].message.content);
    
    return {
      success: true,
      response: response.choices[0].message.content,
      model: "o4-mini",
      filenames: filenames
    };
  } catch (error) {
    console.error('🔴 OpenAI Batch: ERROR -', error.message);
    console.error('- Full error:', error);
    return {
      success: false,
      error: error.message,
      model: "o4-mini",
      filenames: filenames
    };
  }
}

async function callClaude(imagePath, prompt) {
  console.log('🟣 Claude: Starting API call...');
  console.log('- Model: claude-sonnet-4-20250514');
  console.log('- Image path:', imagePath);
  console.log('- Prompt:', prompt || 'Default prompt');
  
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const fileExtension = getFileExtension(imagePath);
    
    console.log('- Image converted to base64, length:', base64Image.length);
    console.log('- File extension:', fileExtension);
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      thinking: {
        type: "enabled",
        budget_tokens: 10000
      },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: `image/${fileExtension}`,
                data: base64Image
              }
            },
            {
              type: "text",
              text: prompt || "Analyze this image and answer any questions you see. For multiple choice questions, respond with ONLY the correct option letter (A, B, C, or D). For math questions, respond with ONLY the correct numerical answer. Do not provide any explanations, reasoning, or additional text."
            }
          ]
        }
      ]
    });
    
    console.log('🟣 Claude: Response received');
    
    // Handle both thinking and text blocks
    let responseText = '';
    let thinkingSummary = '';
    
    for (const block of response.content) {
      if (block.type === "thinking") {
        thinkingSummary = block.thinking;
        console.log('- Thinking summary:', thinkingSummary.substring(0, 100) + '...');
      } else if (block.type === "text") {
        responseText = block.text;
        console.log('- Response:', responseText);
      }
    }
    
    return {
      success: true,
      response: responseText,
      thinking: thinkingSummary,
      model: "claude-sonnet-4-20250514"
    };
  } catch (error) {
    console.error('🟣 Claude: ERROR -', error.message);
    console.error('- Full error:', error);
    return {
      success: false,
      error: error.message,
      model: "claude-sonnet-4-20250514"
    };
  }
}

// NEW: Batch processing function for Claude
async function callClaudeBatch(imagePaths, filenames, prompt) {
  console.log('🟣 Claude Batch: Starting API call...');
  console.log('- Model: claude-sonnet-4-20250514');
  console.log('- Image count:', imagePaths.length);
  console.log('- Prompt:', prompt || 'Default prompt');
  
  try {
    const content = [];
    
    // Add all images to the content array
    imagePaths.forEach((imagePath, index) => {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const fileExtension = getFileExtension(imagePath);
      
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: `image/${fileExtension}`,
          data: base64Image
        }
      });
    });

    // Add the text prompt
    content.push({
      type: "text",
      text: prompt || `I'm sending you ${imagePaths.length} images with questions. Please analyze each image and provide answers. 

IMPORTANT: Format your response as follows:
Image ${filenames[0]}: [answer]
Image ${filenames[1]}: [answer]
${filenames.length > 2 ? `Image ${filenames[2]}: [answer]` : ''}
${filenames.length > 3 ? `Image ${filenames[3]}: [answer]` : ''}
${filenames.length > 4 ? `Image ${filenames[4]}: [answer]` : ''}

For multiple choice questions, respond with ONLY the correct option letter (A, B, C, or D). 
For math questions, respond with ONLY the correct numerical answer. 
Do not provide explanations, reasoning, or additional text beyond the answers.

The filenames are: ${filenames.join(', ')}`
    });
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      thinking: {
        type: "enabled",
        budget_tokens: 10000
      },
      messages: [
        {
          role: "user",
          content: content
        }
      ]
    });
    
    console.log('🟣 Claude Batch: Response received');
    
    // Handle both thinking and text blocks
    let responseText = '';
    let thinkingSummary = '';
    
    for (const block of response.content) {
      if (block.type === "thinking") {
        thinkingSummary = block.thinking;
        console.log('- Thinking summary:', thinkingSummary.substring(0, 100) + '...');
      } else if (block.type === "text") {
        responseText = block.text;
        console.log('- Response:', responseText);
      }
    }
    
    return {
      success: true,
      response: responseText,
      thinking: thinkingSummary,
      model: "claude-sonnet-4-20250514",
      filenames: filenames
    };
  } catch (error) {
    console.error('🟣 Claude Batch: ERROR -', error.message);
    console.error('- Full error:', error);
    return {
      success: false,
      error: error.message,
      model: "claude-sonnet-4-20250514",
      filenames: filenames
    };
  }
}

// Helper function to parse batch responses and split them by image
function parseBatchResponse(batchResponse, filenames) {
  if (!batchResponse.success) {
    return filenames.map(filename => ({
      filename,
      responses: [{
        ...batchResponse,
        filename
      }]
    }));
  }

  const responseText = batchResponse.response;
  const results = [];
  
  // Enhanced parsing logic
  filenames.forEach((filename, index) => {
    let extractedResponse = '';
    
    // Try multiple patterns to extract individual responses
    const patterns = [
      // Pattern 1: "Image filename: answer"
      new RegExp(`Image\\s+${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:([^]*?)(?=Image\\s+\\w|$)`, 'i'),
      // Pattern 2: "filename: answer"
      new RegExp(`${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:([^]*?)(?=\\w+\\.\\w+\\s*:|$)`, 'i'),
      // Pattern 3: Line-by-line parsing for numbered responses
      new RegExp(`(?:^|\\n)\\s*${index + 1}[.)\\s]+([A-Z])(?=\\s|$)`, 'im'),
      // Pattern 4: Just extract single letter answers in sequence
      new RegExp(`(?:^|\\n|\\s)([A-Z])(?=\\s|$|\\n)`, 'g')
    ];
    
    // Try pattern-based extraction first
    for (let i = 0; i < patterns.length - 1; i++) {
      const match = responseText.match(patterns[i]);
      if (match && match[1]) {
        extractedResponse = match[1].trim();
        console.log(`Pattern ${i + 1} matched for ${filename}: "${extractedResponse}"`);
        break;
      }
    }
    
    // If no pattern worked, try to extract answers by position (for simple letter answers)
    if (!extractedResponse || extractedResponse.length > 10) {
      const letterMatches = responseText.match(/\b[A-D]\b/g);
      if (letterMatches && letterMatches[index]) {
        extractedResponse = letterMatches[index];
        console.log(`Position-based extraction for ${filename}: "${extractedResponse}"`);
      }
    }
    
    // If still no response, try splitting by lines and taking the appropriate line
    if (!extractedResponse) {
      const lines = responseText.split(/\n+/).filter(line => line.trim().length > 0);
      if (lines[index]) {
        // Extract just the answer part (usually a single letter)
        const answerMatch = lines[index].match(/\b([A-D])\b/);
        extractedResponse = answerMatch ? answerMatch[1] : lines[index].trim();
        console.log(`Line-based extraction for ${filename}: "${extractedResponse}"`);
      }
    }
    
    // Final fallback: use the entire response but warn about it
    if (!extractedResponse) {
      extractedResponse = responseText;
      console.log(`Fallback: Using entire response for ${filename}`);
    }
    
    results.push({
      filename,
      responses: [{
        ...batchResponse,
        response: extractedResponse,
        filename
      }]
    });
  });
  
  return results;
}

// Helper function to compare responses and determine consensus
function analyzeResponses(responses) {
  console.log('📊 Analyzing responses...');
  console.log('- Total responses:', responses.length);
  console.log('- Successful responses:', responses.filter(r => r.success).length);
  
  const successfulResponses = responses.filter(r => r.success);
  
  if (successfulResponses.length < 1) {
    console.log('- No successful responses');
    return responses.map(r => ({ ...r, status: 'error' }));
  }
  
  // Enhanced comparison logic for question answers
  const responseTexts = successfulResponses.map(r => r.response.toLowerCase().trim());
  console.log('- Response texts for comparison:', responseTexts);
  
  const analyzed = successfulResponses.map((response, index) => {
    const currentText = responseTexts[index];
    
    // Count how many responses match this one
    const matches = responseTexts.filter(text => {
      // For single letter answers (A, B, C, D)
      if (currentText.length === 1 && text.length === 1) {
        return currentText === text;
      }
      
      // For short answers (exact match)
      if (currentText.length <= 5 && text.length <= 5) {
        return currentText === text;
      }
      
      // For longer responses, use similarity
      const words1 = currentText.split(/\s+/);
      const words2 = text.split(/\s+/);
      const commonWords = words1.filter(word => words2.includes(word));
      const similarity = commonWords.length / Math.max(words1.length, words2.length);
      
      // Require higher similarity for consensus (80% instead of 50%)
      return similarity > 0.8;
    });
    
    console.log(`- ${response.model}: "${currentText}" has ${matches.length} matches out of ${responseTexts.length} responses`);
    
    // Determine status based on matches
    let status;
    if (matches.length === responseTexts.length) {
      status = 'consensus'; // All responses match
    } else if (matches.length > 1) {
      status = 'partial'; // Some responses match
    } else {
      status = 'different'; // No other responses match
    }
    
    return {
      ...response,
      matchCount: matches.length,
      status: status
    };
  });
  
  // If we have failed responses, add them back with error status
  const failedResponses = responses.filter(r => !r.success).map(r => ({ ...r, status: 'error' }));
  
  return [...analyzed, ...failedResponses];
}

// API Routes
app.post('/api/analyze', upload.array('images', 5), async (req, res) => {
  console.log('\n🚀 === NEW ANALYSIS REQUEST ===');
  console.log('- Timestamp:', new Date().toISOString());
  console.log('- Files received:', req.files?.length || 0);
  console.log('- Prompt:', req.body.prompt || 'None');
  
  try {
    if (!req.files || req.files.length === 0) {
      console.log('❌ No files uploaded');
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const { prompt } = req.body;
    const results = [];

    for (const file of req.files) {
      const imagePath = file.path;
      console.log(`\n📁 Processing file: ${file.originalname}`);
      console.log('- File path:', imagePath);
      console.log('- File size:', file.size);
      console.log('- MIME type:', file.mimetype);
      
      try {
        // Call OpenAI and Claude concurrently
        console.log('🔄 Starting concurrent API calls...');
        const [openaiResult, claudeResult] = await Promise.all([
          callOpenAI(imagePath, prompt),
          callClaude(imagePath, prompt)
        ]);

        console.log('\n📊 All API calls completed');
        console.log('- OpenAI success:', openaiResult.success);
        console.log('- Claude success:', claudeResult.success);

        const allResponses = [openaiResult, claudeResult];
        const analyzedResponses = analyzeResponses(allResponses);

        results.push({
          filename: file.originalname,
          responses: analyzedResponses
        });

        // Clean up uploaded file
        fs.unlinkSync(imagePath);
        console.log('🗑️ Cleaned up uploaded file');
      } catch (error) {
        console.error('💥 Error processing image:', error);
        results.push({
          filename: file.originalname,
          error: 'Failed to process image'
        });
        
        // Clean up uploaded file
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }

    console.log('\n✅ Analysis complete, sending results...');
    console.log('- Results count:', results.length);
    res.json({ results });
  } catch (error) {
    console.error('💥 Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: Batch processing endpoint for multiple images in single API calls
app.post('/api/analyze-batch', upload.array('images', 5), async (req, res) => {
  console.log('\n🚀 === NEW BATCH ANALYSIS REQUEST ===');
  console.log('- Timestamp:', new Date().toISOString());
  console.log('- Files received:', req.files?.length || 0);
  console.log('- Prompt:', req.body.prompt || 'None');
  
  try {
    if (!req.files || req.files.length === 0) {
      console.log('❌ No files uploaded');
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const { prompt } = req.body;
    const imagePaths = req.files.map(file => file.path);
    const filenames = req.files.map(file => file.originalname);
    
    console.log('\n📁 Processing files in batch:');
    req.files.forEach((file, index) => {
      console.log(`- ${index + 1}. ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
    });

    try {
      // Call OpenAI and Claude batch functions concurrently
      console.log('\n🔄 Starting concurrent BATCH API calls...');
      const [openaiResult, claudeResult] = await Promise.all([
        callOpenAIBatch(imagePaths, filenames, prompt),
        callClaudeBatch(imagePaths, filenames, prompt)
      ]);

      console.log('\n📊 All BATCH API calls completed');
      console.log('- OpenAI batch success:', openaiResult.success);
      console.log('- Claude batch success:', claudeResult.success);

      // Parse batch responses into individual image results
      const openaiResults = parseBatchResponse(openaiResult, filenames);
      const claudeResults = parseBatchResponse(claudeResult, filenames);
      
      // Combine results for each image
      const results = [];
      filenames.forEach((filename, index) => {
        const openaiResponse = openaiResults[index]?.responses[0] || { success: false, error: 'No response', model: 'o4-mini' };
        const claudeResponse = claudeResults[index]?.responses[0] || { success: false, error: 'No response', model: 'claude-sonnet-4-20250514' };
        
        const allResponses = [openaiResponse, claudeResponse];
        const analyzedResponses = analyzeResponses(allResponses);
        
        results.push({
          filename,
          responses: analyzedResponses
        });
      });

      // Clean up uploaded files
      imagePaths.forEach(imagePath => {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log('🗑️ Cleaned up uploaded file:', imagePath);
        }
      });

      console.log('\n✅ Batch analysis complete, sending results...');
      console.log('- Results count:', results.length);
      console.log('- API calls made: 2 (instead of', req.files.length * 2, ')');
      
      res.json({ 
        results,
        batchProcessed: true,
        originalApiCallsSaved: (req.files.length * 2) - 2
      });
      
    } catch (error) {
      console.error('💥 Error in batch processing:', error);
      
      // Clean up uploaded files
      imagePaths.forEach(imagePath => {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
      
      res.status(500).json({ error: 'Failed to process images in batch' });
    }
  } catch (error) {
    console.error('💥 Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'client/build')));

// Catch all handler for React router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  res.status(500).json({ error: 'Something went wrong!' });
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

app.listen(PORT, () => {
  console.log(`\n🌟 Server running on port ${PORT}`);
  console.log(`🌐 Open your browser to: http://localhost:${PORT}`);
}); 