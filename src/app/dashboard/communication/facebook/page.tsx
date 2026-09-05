"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Facebook, Send, Loader2, Image as ImageIcon, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useStorage } from "@/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

export default function FacebookCommunicationPage() {
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const storage = useStorage();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePublish = async () => {
    if (!message.trim() && !imageFile) return;

    setIsPublishing(true);
    try {
      let imageUrl = null;

      if (imageFile && storage) {
        const storageRef = ref(storage, `facebook_uploads/${uuidv4()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }

      const response = await fetch("/api/social/facebook/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, imageUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur de publication");
      }

      toast({
        title: "Publication réussie",
        description: "Votre annonce a été publiée sur la page Facebook.",
        variant: "default",
      });
      
      // Reset after success
      setMessage("");
      removeImage();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la publication.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
          <Facebook className="w-8 h-8 text-blue-600" />
          Réseaux Sociaux
        </h1>
        <p className="text-slate-500 mt-2">
          Publiez des annonces et des photos directement sur la page Facebook de l'école.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl h-full">
            <CardHeader>
              <CardTitle className="font-black tracking-tight text-slate-900">Nouvelle publication</CardTitle>
              <CardDescription>
                Rédigez le message et ajoutez une photo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Contenu du message
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Quoi de neuf à l'école ?"
                  className="min-h-[160px] resize-none rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Photo (optionnel)
                </label>
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    <img src={imagePreview} alt="Aperçu" className="w-full h-auto object-cover max-h-48" />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleImageChange}
                    />
                    <Button 
                      variant="outline" 
                      className="rounded-xl w-full flex gap-2 border-dashed border-2 py-6 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-5 h-5" />
                      Ajouter une photo
                    </Button>
                  </div>
                )}
              </div>

              <Button 
                onClick={handlePublish} 
                disabled={isPublishing || (!message.trim() && !imageFile)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-6 mt-4 shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Publication en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Publier sur Facebook
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="hidden md:block"
        >
          <Card className="rounded-2xl border border-slate-200 shadow-sm h-full bg-slate-50/50">
            <CardHeader>
              <CardTitle className="font-black tracking-tight text-slate-900 flex items-center gap-2 text-base">
                <MessageCircle className="w-5 h-5 text-slate-500" />
                Aperçu de la publication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-400 font-bold">
                      <Facebook className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">Page de l'École</div>
                      <div className="text-xs text-slate-500">À l'instant · 🌍</div>
                    </div>
                  </div>
                  <div className="text-sm text-slate-800 whitespace-pre-wrap">
                    {message || (imagePreview ? "" : "Votre message apparaîtra ici...")}
                  </div>
                </div>
                {imagePreview && (
                  <div className="w-full border-t border-slate-100">
                    <img src={imagePreview} alt="Aperçu post" className="w-full h-auto object-cover max-h-[300px]" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
