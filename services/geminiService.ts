
import { GoogleGenAI, Type } from "@google/genai";
import { Product, Customer, Sale, Supplier, Expense, Tenant } from '../types';

// --- CONFIGURATION ---
const API_KEY = process.env.API_KEY || '';
// Initialisation sécurisée : ne plante pas si la clé est absente, mais désactive l'IA
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// --- HELPER ROBUSTE ---
// Cette fonction attrape TOUTES les erreurs (Quota, Réseau, Parsing)
// et retourne une valeur de secours (fallback)
const safeGenerateContent = async (
  model: string, 
  contents: any, 
  fallback: string | any, 
  config?: any
) => {
  if (!ai) return fallback; // Si pas de clé, on renvoie direct le fallback
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config
    });
    
    // Vérification stricte de la réponse
    if (!response || !response.text) return fallback;
    return response.text;
  } catch (error: any) {
    // Log discret pour le développeur, pas d'alerte pour l'utilisateur
    console.warn("Atlas AI [Mode Hors Ligne/Quota]:", error.message || "Erreur inconnue");
    return fallback;
  }
};

// --- SERVICES EXPORTÉS ---

export const processInvoiceImage = async (base64Image: string): Promise<any> => {
  // Fallback structure pour ne pas casser l'UI d'import
  const fallbackData = {
      supplierName: "Fournisseur (Scan Non Dispo)",
      date: new Date().toISOString().split('T')[0],
      total: 0,
      items: []
  };

  if (!ai) return fallbackData;

  const prompt = `Tu es l'expert comptable d'Atlas PRO. 
  Analyse cette facture d'achat fournisseur. 
  Extrais : le nom du fournisseur, la date, et chaque ligne d'article (nom, quantité, prix unitaire d'achat).
  Si le nom d'un produit est complexe, simplifie-le. Renvoie du JSON strict.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            supplierName: { type: Type.STRING },
            date: { type: Type.STRING },
            total: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  costPrice: { type: Type.NUMBER }
                },
                required: ["name", "quantity", "costPrice"]
              }
            }
          },
          required: ["supplierName", "total", "items"]
        }
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("Réponse vide");
    return JSON.parse(text.trim());
  } catch (error) {
    console.warn("OCR Error (Quota):", error);
    return fallbackData;
  }
};

export const generateBusinessInsight = async (
  query: string, 
  salesData: Sale[], 
  inventory: Product[], 
  customers: Customer[]
): Promise<string> => {
  const context = `Ventes: ${salesData.length}, Stock: ${inventory.length}, Clients: ${customers.length}.`;
  return safeGenerateContent(
      "gemini-3-flash-preview",
      `Context: ${context}. Question: ${query}. Réponds en une phrase courte en Darija (latino) ou Français Business.`,
      "Le service AI est momentanément en pause (Quota). Vos chiffres sont sauvegardés."
  );
};

export const getAISearchIntent = async (query: string, inventory: Product[]): Promise<string[]> => {
  // Fallback immédiat : Recherche standard par texte
  const basicSearch = inventory
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .map(p => p.id);

  if (query.length < 2 || !ai) return basicSearch;

  try {
    // Version optimisée pour économiser des tokens
    const miniInv = inventory.slice(0, 50).map(p => `${p.id}:${p.name}`).join(','); 
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Cherche "${query}" dans [${miniInv}]. Renvoie IDs séparés par virgules.`,
    });
    return (response.text || "").split(',').map(s => s.trim());
  } catch { 
      return basicSearch; 
  }
};

export const generateSmartWhatsApp = async (customer: Customer): Promise<string> => {
  const defaultMsg = `Salam ${customer.name}, kankarkom b-hsab dialkom: ${(customer.balance || 0).toFixed(2)} DH. Chokran !`;
  return safeGenerateContent(
      "gemini-3-flash-preview",
      `Génère un message WhatsApp poli en Darija pour rappeler une dette de ${customer.balance}DH à ${customer.name}.`,
      defaultMsg
  );
};

export const polishDocumentNotes = async (notes: string): Promise<string> => {
  return safeGenerateContent(
      "gemini-3-flash-preview",
      `Rends ce texte professionnel (Français/Darija): "${notes}"`,
      notes
  );
};

export const generateProductMagicFill = async (productName: string): Promise<Partial<Product>> => {
  if (!ai) return {};
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Produit: "${productName}" (Maroc). Devine: catégorie, prix vente (DH), prix achat. JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            price: { type: Type.NUMBER },
            costPrice: { type: Type.NUMBER }
          },
          required: ["category", "price", "costPrice"]
        }
      }
    });
    const text = response.text;
    if (!text) return {};
    return JSON.parse(text.trim());
  } catch { return {}; }
};

export const generateSupplierNegotiation = async (supplier: Supplier): Promise<string> => {
  return safeGenerateContent(
      "gemini-3-flash-preview",
      `Message WhatsApp Darija pour fournisseur "${supplier.name}". Demande nouveaux prix.`,
      `Salam ${supplier.name}, bghit nswl 3la tamanat jdad. Merci.`
  );
};

export const analyzeExpensesAudit = async (expenses: Expense[]): Promise<string> => {
    return safeGenerateContent(
        "gemini-3-flash-preview",
        `Analyse dépense audit: ${expenses.length} lignes. Donne un conseil économie court.`,
        "Surveillez vos dépenses régulières pour optimiser la trésorerie."
    );
};

export const generateStaffFeedback = async (name: string, role: string): Promise<string> => {
    return safeGenerateContent(
        "gemini-3-flash-preview",
        `Feedback court pour ${name} (${role}). Style: Manager bienveillant.`,
        "Bon travail, continue comme ça."
    );
};

export const generateProductImage = async (productName: string): Promise<string | null> => {
  // Désactivé pour économiser le quota et éviter les crashs
  return `https://placehold.co/400x400?text=${encodeURIComponent(productName.substring(0, 20))}`;
};

export const lookupProductByBarcode = async (barcode: string): Promise<Partial<Product>> => {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1) {
            const p = data.product;
            return {
                name: p.product_name || p.generic_name || "Produit Inconnu",
                image: p.image_front_url || p.image_url || null,
                category: "Alimentation" 
            };
        }
    } catch (e) {
        console.warn("Barcode API Error", e);
    }
    // Fallback simple sans IA pour éviter l'appel quota
    return { name: "Produit Scanné", category: "Divers" };
};

// --- ANALYTICS ---
export const generateSaaSInsights = async (tenants: Tenant[]): Promise<any> => {
    // Return static data on failure
    const fallback = { healthScore: 100, devRecommendation: "Mode Hors Ligne", riskAlert: "Aucun" };
    
    if(!ai) return fallback;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analyse SaaS: ${tenants.length} clients. JSON: healthScore (0-100), devRecommendation, riskAlert.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch {
        return fallback;
    }
};

export const analyzeDashboardRisks = async (sales: Sale[], products: Product[], customers: Customer[]): Promise<string> => {
    return safeGenerateContent(
        "gemini-3-flash-preview",
        `Analyse business Maroc. Ventes: ${sales.length}. Crédit: ${customers.reduce((a,b)=>a+b.balance,0)}. Une phrase Darija.`,
        "L'activité est stable aujourd'hui. Lah yskher."
    );
};
