import React, { useState, useCallback, useRef } from 'react';
import mammoth from 'mammoth';
import { extractRecipeFromImage } from './services/geminiService';
import { FileItem, ProcessStatus, Recipe } from './types';
import { RecipeReview } from './components/RecipeReview';


const App = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to read file as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g. "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper to read text file
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
  };

  // Helper to read docx
  const readDocxAsText = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              mammoth.extractRawText({ arrayBuffer })
                  .then((result: any) => resolve(result.value))
                  .catch(reject);
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
      });
  };

  const processFilesToAdd = (addedFiles: File[]) => {
    const newFiles: FileItem[] = addedFiles.map(file => {
        let preview = '';
        if (file.type.startsWith('image/')) {
            preview = URL.createObjectURL(file);
        } else {
            // For PDF, DOCX, TXT we just show an icon placeholder in UI, 
            // but for PDF we can try to show standard preview if browser supports it
            preview = file.type === 'application/pdf' ? URL.createObjectURL(file) : '';
        }

        return {
            id: Math.random().toString(36).substring(7),
            file,
            preview,
            status: ProcessStatus.PENDING
        };
    });
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      processFilesToAdd(Array.from(event.target.files) as File[]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          processFilesToAdd(Array.from(e.dataTransfer.files));
      }
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const startProcessing = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    const pendingFiles = files.filter(f => f.status === ProcessStatus.PENDING);
    
    for (const item of pendingFiles) {
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: ProcessStatus.PROCESSING } : f));
      
      try {
        let data = '';
        let mimeType = item.file.type;

        if (item.file.name.endsWith('.docx')) {
             data = await readDocxAsText(item.file);
             mimeType = 'text/plain';
        } else if (item.file.type === 'text/plain' || item.file.name.endsWith('.txt')) {
             data = await readFileAsText(item.file);
             mimeType = 'text/plain';
        } else {
             // Image or PDF
             data = await readFileAsBase64(item.file);
        }

        const recipe = await extractRecipeFromImage(data, mimeType);
        recipe.original_file_name = item.file.name;

        setFiles(prev => prev.map(f => f.id === item.id ? { 
          ...f, 
          status: ProcessStatus.REVIEW,
          recipe 
        } : f));

        if (!activeFileId) setActiveFileId(item.id);

      } catch (error) {
        setFiles(prev => prev.map(f => f.id === item.id ? { 
          ...f, 
          status: ProcessStatus.ERROR,
          error: error instanceof Error ? error.message : "Unknown error"
        } : f));
      }
    }
    setIsProcessing(false);
  };

  const handleRecipeSave = (updatedRecipe: Recipe) => {
    if (!activeFileId) return;

    setFiles(prev => prev.map(f => f.id === activeFileId ? { 
      ...f, 
      status: ProcessStatus.COMPLETED,
      recipe: updatedRecipe
    } : f));

    setActiveFileId(null);
  };

  const testTandoorConnection = async () => {
      // Create a mock recipe for testing
      const testRecipe: Recipe = {
          name: "Test Recipe - Chocolate Chip Cookies",
          description: "A simple test recipe to verify Tandoor integration is working correctly.",
          servings: 24,
          prep_time_minutes: 15,
          cook_time_minutes: 12,
          ingredients: [
              { amount: "2.25", unit: "cups", name: "all-purpose flour", note: "" },
              { amount: "1", unit: "tsp", name: "baking soda", note: "" },
              { amount: "1", unit: "cup", name: "butter", note: "softened" },
              { amount: "0.75", unit: "cup", name: "sugar", note: "" },
              { amount: "2", unit: "cups", name: "chocolate chips", note: "" }
          ],
          steps: [
              { instruction: "Preheat oven to 375°F (190°C)." },
              { instruction: "Mix flour and baking soda in a bowl." },
              { instruction: "Cream butter and sugar until fluffy." },
              { instruction: "Combine wet and dry ingredients, then fold in chocolate chips." },
              { instruction: "Drop spoonfuls onto baking sheet and bake for 10-12 minutes." }
          ],
          keywords: ["test", "cookies", "dessert"]
      };

      await uploadToTandoor(testRecipe);
  };

  const uploadToTandoor = async (recipe: Recipe) => {
      const tandoorApiKey = process.env.TANDOOR_API_KEY;

      if (!tandoorApiKey) {
          alert("Tandoor API Key not configured. Please set TANDOOR_API_KEY environment variable.");
          return;
      }

      // Basic mapping for Tandoor API.
      // Note: Tandoor API is complex for ingredients (needs food IDs).
      // This payload attempts to create a recipe. Success depends on server config (if it allows creating foods/units on fly).

      // Map ingredients to Tandoor format
      const mappedIngredients = (recipe.ingredients || []).map(ing => ({
          amount: parseFloat(ing.amount) || 0,
          unit: { name: ing.unit },
          food: { name: ing.name },
          note: ing.note || ''
      }));

      // Create steps array
      const steps = (recipe.steps || []).map((s, index) => ({
          instruction: s.instruction,
          // Put all ingredients in the first step (Tandoor expects ingredients inside steps, not at recipe level)
          ingredients: index === 0 ? mappedIngredients : []
      }));

      const payload = {
          name: recipe.name,
          description: recipe.description,
          steps: steps,
          servings: recipe.servings,
          working_time: recipe.prep_time_minutes,
          waiting_time: recipe.cook_time_minutes,
          keywords: (recipe.keywords || []).map(k => ({ name: k }))
      };

      try {
          // Use nginx proxy endpoint to avoid CORS
          const baseUrl = '/tandoor-api';
          console.log(`Attempting to upload recipe to: ${baseUrl}/api/recipe/`);
          console.log('Payload:', payload);

          const response = await fetch(`${baseUrl}/api/recipe/`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${tandoorApiKey}`
              },
              body: JSON.stringify(payload)
          });

          console.log('Tandoor response status:', response.status);

          if (response.ok) {
              const responseData = await response.json();
              console.log('Upload success:', responseData);
              alert("Successfully uploaded to Tandoor!");
          } else {
              const err = await response.text();
              console.error('Tandoor upload failed. Status:', response.status);
              console.error('Error details:', err);
              alert(`Failed to upload (Status ${response.status}). Check console for details. Tandoor API might require pre-existing Food IDs.`);
          }
      } catch (e) {
          console.error('Exception during Tandoor upload:', e);
          alert("Network error connecting to Tandoor. Check console for details.");
      }
  };

  const handleDownloadJson = (fileId: string) => {
    const item = files.find(f => f.id === fileId);
    if (item && item.recipe) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item.recipe, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `${item.recipe.name || 'recipe'}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  };

  const handleDownloadAll = () => {
    const completed = files.filter(f => f.status === ProcessStatus.COMPLETED && f.recipe).map(f => f.recipe);
    if (completed.length === 0) return;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(completed, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "tandoor_import_batch.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const getStatusColor = (status: ProcessStatus) => {
    switch (status) {
      case ProcessStatus.PENDING: return 'text-slate-400';
      case ProcessStatus.PROCESSING: return 'text-blue-400 animate-pulse';
      case ProcessStatus.REVIEW: return 'text-amber-400';
      case ProcessStatus.COMPLETED: return 'text-emerald-400';
      case ProcessStatus.ERROR: return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const activeItem = files.find(f => f.id === activeFileId);

  return (
    <div 
        className="flex h-screen w-full bg-slate-900 text-slate-100 overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
    >
      
      {/* Sidebar / Queue */}
      <div className="w-1/3 min-w-[300px] border-r border-slate-700 flex flex-col bg-slate-900 z-10">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Recipe Migrator</h1>
          <p className="text-slate-400 text-sm mb-4">Digitize images, PDF, TXT, DOCX.</p>
          
          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 px-4 rounded border border-slate-600 transition-colors text-sm font-medium"
            >
              + Add Files
            </button>
            <input 
              type="file" 
              multiple 
              accept="image/*,application/pdf,.txt,.docx"
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
            />
            <button 
              onClick={startProcessing}
              disabled={isProcessing || !files.some(f => f.status === ProcessStatus.PENDING)}
              className={`flex-1 py-2 px-4 rounded text-white text-sm font-medium transition-colors ${
                isProcessing || !files.some(f => f.status === ProcessStatus.PENDING)
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                : 'bg-indigo-600 hover:bg-indigo-500 border border-indigo-600'
              }`}
            >
              {isProcessing ? 'Processing...' : 'Run Batch AI'}
            </button>
          </div>
          
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
            <span>{files.length} items</span>
            {files.filter(f => f.status === ProcessStatus.COMPLETED).length > 0 && (
                 <button onClick={handleDownloadAll} className="text-indigo-400 hover:text-indigo-300">Download All JSON</button>
            )}
          </div>

          <button
            onClick={testTandoorConnection}
            className="w-full text-xs py-2 px-3 rounded font-medium transition-colors bg-indigo-600 hover:bg-indigo-500 text-white mb-2"
          >
            Test Tandoor Connection
          </button>

          <p className="text-[10px] text-slate-500">
            Tandoor URL and API Key configured via environment variables
          </p>

        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {files.map(item => (
            <div 
              key={item.id}
              onClick={() => (item.status === ProcessStatus.REVIEW || item.status === ProcessStatus.COMPLETED) && setActiveFileId(item.id)}
              className={`p-3 rounded-lg border flex gap-3 items-center cursor-pointer transition-all ${
                activeFileId === item.id 
                  ? 'bg-slate-800 border-indigo-500 ring-1 ring-indigo-500' 
                  : 'bg-slate-900 border-slate-700 hover:border-slate-600'
              } ${item.status === ProcessStatus.ERROR ? 'border-red-900 bg-red-900/10' : ''}`}
            >
              <div className="h-12 w-12 bg-slate-800 rounded overflow-hidden flex-shrink-0 border border-slate-700 flex items-center justify-center">
                {item.file.type.startsWith('image') && item.preview ? (
                   <img src={item.preview} alt="preview" className="h-full w-full object-cover" />
                ) : (
                    <span className="text-xs text-slate-500 font-bold uppercase">{item.file.name.split('.').pop()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium text-slate-200">{item.file.name}</div>
                <div className={`text-xs uppercase tracking-wider font-bold ${getStatusColor(item.status)}`}>
                  {item.status}
                </div>
              </div>
              {item.status === ProcessStatus.COMPLETED && (
                  <div className="flex gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); uploadToTandoor(item.recipe!); }}
                        title="Upload to Tandoor"
                        className="p-2 text-slate-500 hover:text-indigo-400"
                    >
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadJson(item.id); }}
                        title="Download JSON"
                        className="p-2 text-slate-500 hover:text-white"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    </button>
                  </div>
              )}
            </div>
          ))}
          
          {files.length === 0 && (
            <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-800 rounded-lg m-4">
                <p className="mb-2">Drag and drop files here</p>
                <p className="text-xs">Images, PDF, TXT, DOCX</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content / Review Area */}
      <div className="flex-1 bg-slate-950 p-6 overflow-hidden flex flex-col relative">
        {activeItem && activeItem.recipe ? (
          <div className="h-full flex gap-6">
            {/* File Preview Panel */}
            <div className="w-1/3 bg-slate-900 rounded-lg border border-slate-800 p-4 flex flex-col">
                <h3 className="text-sm font-bold text-slate-400 mb-2">Source File</h3>
                <div className="flex-1 overflow-auto bg-black/50 rounded flex items-center justify-center border border-slate-800 relative">
                    {activeItem.file.type.startsWith('image') ? (
                         <img src={activeItem.preview} alt="Full source" className="max-w-full max-h-full object-contain" />
                    ) : activeItem.file.type === 'application/pdf' ? (
                        <iframe src={activeItem.preview} className="w-full h-full" title="PDF Preview"></iframe>
                    ) : (
                        <div className="text-slate-500 flex flex-col items-center">
                            <span className="text-4xl mb-2">📄</span>
                            <span>{activeItem.file.name}</span>
                            <span className="text-xs mt-2 opacity-50">Text content extracted</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Panel */}
            <div className="flex-1 h-full">
                <RecipeReview 
                    recipe={activeItem.recipe} 
                    onSave={handleRecipeSave} 
                    onCancel={() => setActiveFileId(null)}
                />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <div className="w-24 h-24 mb-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            </div>
            <p className="text-lg font-medium">Select a file from the queue to review</p>
            <p className="text-sm">Configure Tandoor in the sidebar to upload.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;