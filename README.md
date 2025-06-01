# 🤖 Multi-LLM Question Solver

A powerful web application that analyzes images with questions using three AI models simultaneously: **OpenAI GPT-4o-mini**, **Google Gemini 1.5 Flash**, and **Claude 3.5 Sonnet**. Get consensus-based answers with visual indicators showing agreement between models.

![App Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node.js-18%2B-green)

## 🌟 Features

- **Multi-LLM Analysis**: Concurrent processing with 3 top AI models
- **Visual Consensus**: Color-coded results showing agreement/disagreement
- **Drag & Drop Interface**: Modern, intuitive file upload
- **Custom Prompts**: Add specific questions or use default analysis
- **Multiple Images**: Process up to 5 images simultaneously
- **Production Ready**: Optimized for deployment on Render.com
- **Rate Limited**: Built-in protection against abuse
- **Error Handling**: Robust error handling and user feedback

## 🎯 How It Works

1. **Upload Images**: Drag & drop or click to upload images (JPEG, PNG, GIF, WebP)
2. **Add Prompt** (Optional): Specify custom questions or use default analysis
3. **Analyze**: Click "Analyze Images" to send to all 3 AI models concurrently
4. **View Results**: See responses with visual indicators:
   - 🟢 **Green Check**: Consensus (2+ models agree)
   - 🔴 **Red X**: Different/Error
   - ⚠️ **Warning**: Processing issues

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- API keys for:
  - OpenAI (GPT-4o-mini)
  - Google AI (Gemini 1.5 Flash)
  - Anthropic (Claude 3.5 Sonnet)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd llm-question-solver
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd client
npm install
cd ..
```

4. **Set up environment variables**
```bash
# Copy the template
copy env-template.txt .env

# Edit .env with your API keys
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3000
NODE_ENV=production
```

5. **Build the frontend**
```bash
npm run build
```

6. **Start the application**
```bash
npm start
```

The app will be available at `http://localhost:3000`

## 🧪 Development Mode

For development with hot reloading:

1. **Start the backend**
```bash
npm run dev
```

2. **Start the frontend** (in a new terminal)
```bash
cd client
npm start
```

Frontend will run on `http://localhost:3001` and proxy API calls to backend.

## 🌐 Deployment on Render.com

### Environment Variables on Render
Set these in your Render dashboard:

```
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
NODE_ENV=production
```

### Build Command
```bash
npm install && npm run build
```

### Start Command
```bash
npm start
```

The app is optimized for Render's automatic deployments from Git.

## 📁 Project Structure

```
llm-question-solver/
├── server.js              # Express server & API endpoints
├── package.json           # Backend dependencies
├── env-template.txt       # Environment variables template
├── client/                # React frontend
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   ├── App.css       # Component styles
│   │   ├── index.js      # React entry point
│   │   └── index.css     # Global styles
│   ├── public/
│   │   └── index.html    # HTML template
│   └── package.json      # Frontend dependencies
└── uploads/               # Temporary file storage (auto-created)
```

## 🔧 API Endpoints

### POST `/api/analyze`
Upload images for multi-LLM analysis.

**Request:**
- Content-Type: `multipart/form-data`
- Files: `images` (up to 5 files, max 10MB each)
- Text: `prompt` (optional custom prompt)

**Response:**
```json
{
  "results": [
    {
      "filename": "question.jpg",
      "responses": [
        {
          "success": true,
          "response": "Answer from AI model",
          "model": "GPT-4o-mini",
          "status": "consensus",
          "matchCount": 2
        },
        // ... other models
      ]
    }
  ]
}
```

### GET `/api/health`
Health check endpoint.

## 🛡️ Security Features

- **Rate Limiting**: 50 requests per 15 minutes per IP
- **File Validation**: Only image files allowed, size limits enforced
- **CORS Protection**: Configured for production
- **Helmet Security**: Security headers enabled
- **Input Sanitization**: Secure file handling

## ⚡ Performance Optimizations

- **Concurrent API Calls**: All 3 LLMs called simultaneously
- **File Compression**: Gzip compression enabled
- **Static File Serving**: Optimized for production
- **Error Boundaries**: Graceful error handling
- **Memory Management**: Automatic file cleanup

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern Interface**: Clean, professional styling
- **Real-time Feedback**: Loading states and progress indicators
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Visual Consensus**: Intuitive color coding for results

## 📊 Supported File Types

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- Maximum file size: 10MB per image
- Maximum files: 5 images per request

## 🤖 AI Models Used

1. **OpenAI GPT-4o-mini**: Fast, cost-effective vision model
2. **Google Gemini 1.5 Flash**: High-speed multimodal AI
3. **Claude 3.5 Sonnet**: Advanced reasoning and analysis

## 💡 Use Cases

- **Math Problems**: Solve equations, word problems, geometry
- **English Questions**: Reading comprehension, grammar, writing
- **Science**: Physics, chemistry, biology questions
- **General Knowledge**: History, geography, current events
- **Test Preparation**: SAT, ACT, standardized test questions

## 🔍 Troubleshooting

### Common Issues

1. **API Key Errors**: Ensure all 3 API keys are correctly set in environment variables
2. **File Upload Fails**: Check file size (max 10MB) and format (images only)
3. **Slow Response**: Large images or complex questions may take longer
4. **Rate Limiting**: Wait if you've exceeded the request limit

### Debug Mode
Set `NODE_ENV=development` for detailed error logs.

## 📈 Scaling Considerations

- **API Rate Limits**: Monitor usage of all 3 AI services
- **Cost Management**: Track API costs, especially for high-volume usage
- **Caching**: Consider implementing response caching for repeated questions
- **Load Balancing**: Use multiple instances for high traffic

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🙋‍♂️ Support

For issues, questions, or feature requests, please create an issue in the repository.

---

**Built with ❤️ for reliable, fast AI-powered question solving** 