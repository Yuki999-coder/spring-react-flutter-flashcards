"use client";

import { useState } from "react";
import { Download, Upload, Copy, CheckCircle2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImportExportDialogProps {
  deckId: number;
  onImportSuccess?: () => void;
}

export function ImportExportDialog({ deckId, onImportSuccess }: ImportExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [delimiter, setDelimiter] = useState("tab");
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewData, setPreviewData] = useState<Array<{ term: string; definition: string }>>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = () => {
    if (!importText.trim()) {
      toast.error("Vui lòng nhập dữ liệu");
      return;
    }

    const lines = importText.trim().split("\n");
    const delimiterChar = delimiter === "tab" ? "\t" : delimiter === "comma" ? "," : ";";
    
    const preview = lines
      .filter(line => line.trim())
      .map((line, index) => {
        const parts = line.split(delimiterChar);
        return {
          term: parts[0]?.trim() || "",
          definition: parts[1]?.trim() || "",
        };
      })
      .slice(0, 10); // Show first 10 as preview

    setPreviewData(preview);
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      toast.error("Vui lòng nhập dữ liệu");
      return;
    }

    setIsImporting(true);
    try {
      const response = await api.post(`/decks/${deckId}/import`, {
        content: importText,
        delimiter: delimiter,
      });

      const result = response.data;
      
      toast.success(
        `✅ Import thành công ${result.successCount}/${result.totalLines} thẻ!`
      );

      if (result.errors && result.errors.length > 0) {
        console.warn("Import errors:", result.errors);
        toast.warning(`⚠️ ${result.failedCount} thẻ lỗi - xem console để biết chi tiết`);
      }

      setImportText("");
      setShowPreview(false);
      setPreviewData([]);
      setOpen(false);
      
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Lỗi khi import";
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setIsExporting(true);
    try {
      const response = await api.get(`/decks/${deckId}/export/quizlet`);
      await navigator.clipboard.writeText(response.data);
      toast.success("✅ Đã copy vào clipboard! Có thể dán vào Quizlet/Anki");
    } catch (error: any) {
      const message = error.response?.data?.message || "Lỗi khi export";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCSV = async () => {
    setIsExporting(true);
    try {
      const response = await api.get(`/decks/${deckId}/export/csv`);
      
      // Create blob and download
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `deck-${deckId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("✅ Tải file CSV thành công!");
    } catch (error: any) {
      const message = error.response?.data?.message || "Lỗi khi tải file";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Import / Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import & Export Thẻ học</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <h4 className="font-semibold text-blue-900 mb-2">📋 Hướng dẫn Import từ Quizlet:</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-800">
                <li>Vào Quizlet → Chọn bộ thẻ</li>
                <li>Nhấn nút <strong>⋮ (3 chấm)</strong> → <strong>Export</strong></li>
                <li>Chọn <strong>"Copy text"</strong></li>
                <li>Dán vào ô bên dưới và nhấn <strong>"Preview"</strong></li>
              </ol>
              <p className="mt-2 text-xs text-blue-700">
                💡 Định dạng: <code>Thuật ngữ [TAB] Định nghĩa</code> (mỗi thẻ 1 dòng)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delimiter">Ngăn cách bằng</Label>
              <Select value={delimiter} onValueChange={setDelimiter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tab">Tab (Quizlet, Anki)</SelectItem>
                  <SelectItem value="comma">Phẩy (CSV)</SelectItem>
                  <SelectItem value="semicolon">Chấm phẩy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-text">Dữ liệu Import</Label>
              <Textarea
                id="import-text"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`Ví dụ (dùng ${delimiter === "tab" ? "Tab" : delimiter === "comma" ? "Phẩy" : "Chấm phẩy"}):\n\nHello${delimiter === "tab" ? "\t" : delimiter === "comma" ? "," : ";"}Xin chào\nGoodbye${delimiter === "tab" ? "\t" : delimiter === "comma" ? "," : ";"}Tạm biệt\nThank you${delimiter === "tab" ? "\t" : delimiter === "comma" ? "," : ";"}Cảm ơn`}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Mỗi dòng: Thuật ngữ {delimiter === "tab" ? "[TAB]" : delimiter === "comma" ? "[,]" : "[;]"} Định nghĩa
              </p>
            </div>

            {/* Preview */}
            {showPreview && previewData.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Preview ({previewData.length} thẻ đầu tiên)
                </h4>
                <div className="space-y-2">
                  {previewData.map((item, index) => (
                    <div key={index} className="bg-white p-3 rounded border text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Thuật ngữ</div>
                          <div className="font-medium">{item.term || <span className="text-red-500">⚠️ Trống</span>}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Định nghĩa</div>
                          <div>{item.definition || <span className="text-red-500">⚠️ Trống</span>}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handlePreview} variant="outline" disabled={isImporting}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleImport} disabled={isImporting} className="flex-1">
                {isImporting ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Đang import...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {previewData.length > 0 && `(${previewData.length} thẻ)`}
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">📤 Export dữ liệu</h4>
              <p className="text-sm text-green-800">
                Xuất toàn bộ thẻ trong bộ này để sao lưu hoặc chuyển sang ứng dụng khác như Quizlet, Anki, Knowt.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleCopyToClipboard} 
                disabled={isExporting}
                variant="outline"
                className="w-full justify-start"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard (Định dạng Quizlet)
              </Button>

              <Button 
                onClick={handleDownloadCSV} 
                disabled={isExporting}
                variant="outline"
                className="w-full justify-start"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Download CSV File
              </Button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
              <h4 className="font-semibold text-yellow-900 mb-2">💡 Mẹo:</h4>
              <ul className="list-disc list-inside space-y-1 text-yellow-800">
                <li><strong>Copy to Clipboard:</strong> Dán trực tiếp vào Quizlet (Import → Paste)</li>
                <li><strong>CSV File:</strong> Mở bằng Excel, Google Sheets hoặc import vào Anki</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
