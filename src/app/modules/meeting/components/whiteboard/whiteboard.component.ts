import { Component, ElementRef, OnDestroy, ViewChild, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface WhiteboardAction {
  type: 'draw' | 'clear' | 'text' | 'shape';
  data: any;
  timestamp: number;
  userId: string;
}

interface DrawPoint {
  x: number;
  y: number;
  color: string;
  width: number;
  tool: string;
}

interface TextData {
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './whiteboard.component.html',
  styleUrls: ['./whiteboard.component.scss']
})
export class WhiteboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() currentUser: string = 'You';
  @Output() onAction = new EventEmitter<WhiteboardAction>();
  
  ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  // Drawing tools
  selectedTool: 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text' = 'pen';
  selectedColor = '#000000';
  lineWidth = 2;
  fontSize = 16;
  
  // Undo/Redo stacks
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private maxHistorySize = 50;
  
  // Text tool state
  isAddingText = false;
  textInput = '';
  textX = 0;
  textY = 0;
  showTextInput = false;
  
  // Predefined colors
  colors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];
  
  // Line widths
  lineWidths = [1, 2, 4, 6, 8, 12];
  
  // Font sizes for text
  fontSizes = [12, 14, 16, 20, 24, 32];

  // For shape drawing
  private startX = 0;
  private startY = 0;
  private snapshot: ImageData | null = null;
  
  // Drawing data for real-time sync
  private currentPath: DrawPoint[] = [];
  private lastEmitTime = 0;
  private pendingPoints: DrawPoint[] = [];

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  private initCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    this.ctx = ctx;

    // Set canvas size to full container
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas.bind(this));

    // Set initial drawing settings
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = this.selectedColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.font = `${this.fontSize}px Arial`;
    
    // Fill white background
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save initial state to undo stack
    this.saveToHistory();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = canvas.parentElement;
    
    if (!container) return;

    // Save current canvas content
    const imageData = this.ctx ? this.ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Restore canvas content if exists
    if (imageData && this.ctx) {
      this.ctx.putImageData(imageData, 0, 0);
    } else if (this.ctx) {
      // Fill white background for new canvas
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
      this.ctx.strokeStyle = this.selectedColor;
      this.ctx.lineWidth = this.lineWidth;
      this.ctx.lineJoin = 'round';
      this.ctx.lineCap = 'round';
    }
  }

  startDrawing(event: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
    this.startX = this.lastX;
    this.startY = this.lastY;

    // Text tool: show input at click position
    if (this.selectedTool === 'text') {
      this.textX = this.lastX;
      this.textY = this.lastY;
      this.showTextInput = true;
      this.textInput = '';
      setTimeout(() => {
        const input = document.querySelector('.text-input') as HTMLInputElement;
        if (input) input.focus();
      }, 0);
      return;
    }

    this.isDrawing = true;
    this.currentPath = [];

    // Save snapshot for shape drawing
    if (this.selectedTool !== 'pen' && this.selectedTool !== 'eraser') {
      this.snapshot = this.ctx.getImageData(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
    }

    // Start path for pen and eraser
    if (this.selectedTool === 'pen' || this.selectedTool === 'eraser') {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      
      const startPoint = { x: this.lastX, y: this.lastY, color: this.selectedColor, width: this.lineWidth, tool: this.selectedTool };
      this.currentPath.push(startPoint);
      this.pendingPoints.push(startPoint);
      
      // Emit start immediately to establish start point
      this.flushPendingPoints();
    }
  }

  draw(event: MouseEvent): void {
    if (!this.isDrawing) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    // Set stroke style based on tool
    if (this.selectedTool === 'eraser') {
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = this.lineWidth * 2; // Eraser is wider
    } else {
      this.ctx.strokeStyle = this.selectedColor;
      this.ctx.lineWidth = this.lineWidth;
    }

    if (this.selectedTool === 'pen' || this.selectedTool === 'eraser') {
      // Free drawing
      this.ctx.lineTo(currentX, currentY);
      this.ctx.stroke();
      
      const point = { x: currentX, y: currentY, color: this.selectedColor, width: this.lineWidth, tool: this.selectedTool };
      this.currentPath.push(point);
      this.pendingPoints.push(point);
      this.lastX = currentX;
      this.lastY = currentY;

      // Throttle emission
      const now = Date.now();
      if (now - this.lastEmitTime > 50 || this.pendingPoints.length > 5) {
        this.flushPendingPoints();
      }
    } else {
      // Shape drawing - restore snapshot and draw preview
      if (this.snapshot) {
        this.ctx.putImageData(this.snapshot, 0, 0);
      }

      this.ctx.beginPath();
      
      if (this.selectedTool === 'line') {
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(currentX, currentY);
        this.ctx.stroke();
      } else if (this.selectedTool === 'rectangle') {
        const width = currentX - this.startX;
        const height = currentY - this.startY;
        this.ctx.strokeRect(this.startX, this.startY, width, height);
      } else if (this.selectedTool === 'circle') {
        const radius = Math.sqrt(Math.pow(currentX - this.startX, 2) + Math.pow(currentY - this.startY, 2));
        this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
      }
    }
  }

  stopDrawing(): void {
    if (!this.isDrawing) return;

    if (this.selectedTool === 'pen' || this.selectedTool === 'eraser') {
      this.ctx.closePath();
      
      // Flush any remaining points
      this.flushPendingPoints();

    } else if (this.selectedTool === 'line' || this.selectedTool === 'rectangle' || this.selectedTool === 'circle') {
      // Emit shape action
      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
      this.emitAction({
        type: 'shape',
        data: {
          tool: this.selectedTool,
          startX: this.startX,
          startY: this.startY,
          endX: this.lastX,
          endY: this.lastY,
          color: this.selectedColor,
          width: this.lineWidth
        },
        timestamp: Date.now(),
        userId: this.currentUser
      });
    }

    this.isDrawing = false;
    this.snapshot = null;
    this.currentPath = [];
    this.isDrawing = false;
    this.snapshot = null;
    this.currentPath = [];
    this.pendingPoints = [];
    this.saveToHistory();
  }

  private flushPendingPoints(): void {
    if (this.pendingPoints.length === 0) return;

    // Send points (including the last point of previous chunk for continuity if needed, 
    // but canvas lineTo handles simple point lists well enough if we include start point of segment)
    // Actually, for smooth lines, receiver needs to moveTo first point of chunk.
    
    this.emitAction({
      type: 'draw',
      data: { path: [...this.pendingPoints], tool: this.selectedTool }, // Send copy
      timestamp: Date.now(),
      userId: this.currentUser
    });

    this.pendingPoints = []; // Clear pending
    // Keep the last point as start of next chunk if continuous? 
    // Drawing usually requires [prev, current] to draw a line.
    // If I clear pending, the next chunk starts with a new point.
    // So visual gap might appear if I don't bridge them.
    // Fix: Keep last point in pending
    if (this.currentPath.length > 0) {
         this.pendingPoints.push(this.currentPath[this.currentPath.length - 1]);
    }

    this.lastEmitTime = Date.now();
  }

  handleRemoteAction(action: WhiteboardAction): void {
    if (!this.ctx) return;

    switch (action.type) {
      case 'draw':
        this.drawRemotePath(action.data);
        break;
      case 'clear':
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
        this.saveToHistory(); // Save clear to history
        break;
      case 'text':
        this.ctx.fillStyle = action.data.color;
        this.ctx.font = `${action.data.fontSize}px Arial`;
        this.ctx.fillText(action.data.text, action.data.x, action.data.y);
        this.saveToHistory();
        break;
      case 'shape':
        this.drawRemoteShape(action.data);
        this.saveToHistory();
        break;
    }
  }

  private drawRemotePath(data: any): void {
    if (!data.path || data.path.length === 0) return;

    const path = data.path;
    this.ctx.beginPath();
    
    // Move to first point
    this.ctx.moveTo(path[0].x, path[0].y);

    for (let i = 1; i < path.length; i++) {
        this.ctx.strokeStyle = data.tool === 'eraser' ? '#FFFFFF' : path[i].color;
        this.ctx.lineWidth = data.tool === 'eraser' ? path[i].width * 2 : path[i].width;
        this.ctx.lineTo(path[i].x, path[i].y);
        
        // We need to stroke each segment or group if colors/widths could change (though usually they don't in one stroke)
        // But for simplicity of 'tool' property which is per-chunk in my data structure:
    }
    this.ctx.stroke();
    // Do not closePath for freehand usually
  }

  private drawRemoteShape(data: any): void {
    this.ctx.strokeStyle = data.color;
    this.ctx.lineWidth = data.width;
    this.ctx.beginPath();

    if (data.tool === 'line') {
      this.ctx.moveTo(data.startX, data.startY);
      this.ctx.lineTo(data.endX, data.endY);
      this.ctx.stroke();
    } else if (data.tool === 'rectangle') {
      const width = data.endX - data.startX;
      const height = data.endY - data.startY;
      this.ctx.strokeRect(data.startX, data.startY, width, height);
    } else if (data.tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(data.endX - data.startX, 2) + Math.pow(data.endY - data.startY, 2)
      );
      this.ctx.arc(data.startX, data.startY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
  }

  selectTool(tool: 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'text'): void {
    this.selectedTool = tool;
    this.showTextInput = false;
  }

  selectColor(color: string): void {
    this.selectedColor = color;
  }

  selectLineWidth(width: number): void {
    this.lineWidth = width;
  }

  selectFontSize(size: number): void {
    this.fontSize = size;
    this.ctx.font = `${this.fontSize}px Arial`;
  }

  addText(): void {
    if (!this.textInput.trim()) {
      this.showTextInput = false;
      return;
    }

    this.ctx.fillStyle = this.selectedColor;
    this.ctx.font = `${this.fontSize}px Arial`;
    this.ctx.fillText(this.textInput, this.textX, this.textY);
    
    // Emit text action for real-time sync
    this.emitAction({
      type: 'text',
      data: {
        text: this.textInput,
        x: this.textX,
        y: this.textY,
        color: this.selectedColor,
        fontSize: this.fontSize
      },
      timestamp: Date.now(),
      userId: this.currentUser
    });

    this.showTextInput = false;
    this.textInput = '';
    this.saveToHistory();
  }

  cancelText(): void {
    this.showTextInput = false;
    this.textInput = '';
  }

  clearCanvas(): void {
    if (confirm('Are you sure you want to clear the whiteboard?')) {
      const canvas = this.canvasRef.nativeElement;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      this.emitAction({
        type: 'clear',
        data: {},
        timestamp: Date.now(),
        userId: this.currentUser
      });
      
      this.saveToHistory();
    }
  }

  downloadCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  // Undo/Redo functionality
  private saveToHistory(): void {
    const canvas = this.canvasRef.nativeElement;
    const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    this.undoStack.push(imageData);
    
    // Limit history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    
    // Clear redo stack when new action is performed
    this.redoStack = [];
  }

  undo(): void {
    if (this.undoStack.length <= 1) return; // Keep at least initial state
    
    const current = this.undoStack.pop();
    if (current) {
      this.redoStack.push(current);
    }
    
    const previous = this.undoStack[this.undoStack.length - 1];
    if (previous) {
      this.ctx.putImageData(previous, 0, 0);
    }
  }

  redo(): void {
    if (this.redoStack.length === 0) return;
    
    const imageData = this.redoStack.pop();
    if (imageData) {
      this.undoStack.push(imageData);
      this.ctx.putImageData(imageData, 0, 0);
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // Emit action for real-time sync
  private emitAction(action: WhiteboardAction): void {
    this.onAction.emit(action);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeCanvas.bind(this));
  }
}
