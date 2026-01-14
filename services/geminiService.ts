
import { GoogleGenAI, Type } from "@google/genai";
import { Product, Customer, Sale, Supplier, Expense, Tenant } from '../types';

// --- CONFIGURATION ---
// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- HELPER ROBUSTE ---
const safeGenerateContent = async (
  model: string, 
  contents: any, 
  fallback: string | any, 
  config?: any
) => {
  try {
    const response = await ai.models.generateContent({
      model,
      contents,
      config
    });
    
    if (!response || !response.text) return fallback;
    return response.text;
  } catch (error: any) {
    // Gestion spécifique du Quota (429) pour ne pas polluer la console
    if (JSON.stringify(error).includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn("Atlas AI: Quota atteint. Mode hors ligne activé.");
    } else {
        console.warn("Atlas AI Error:", error.message || "Erreur inconnue");
    }
    return fallback;
  }
};

// --- SERVICES EXPORTÉS ---

export const processInvoiceImage = async (base64Image: string): Promise<any> => {
  const fallbackData = {
      supplierName: "",
      date: new Date().toISOString().split('T')[0],
      total: 0,
      items: []
  };

  const prompt = `Tu es un assistant comptable pour un commerce au Maroc.
  Analyse cette image de Bon de Livraison ou Facture.
  
  Extrais les informations suivantes :
  1. "supplierName": Le nom de l'entreprise ou du fournisseur en haut de la facture (Ex: Centrale Danone, Copag, Grossiste X).
  2. "date": La date de la facture (Format YYYY-MM-DD).
  3. "total": Le montant total net à payer.
  4. "items": La liste des produits achetés (Nom, Quantité, Prix d'achat unitaire).
  
  Si tu ne trouves pas le nom du fournisseur, mets une chaine vide.
  Renvoie uniquement du JSON.`;

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
      "Service AI momentanément indisponible (Quota)."
  );
};

export const getAISearchIntent = async (query: string, inventory: Product[]): Promise<string[]> => {
  const basicSearch = inventory
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
      .map(p => p.id);

  if (query.length < 2) return basicSearch;

  try {
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
        "Surveillez vos d\u00e9penses r\u00e9guli\u00e8res pour optimiser la tr\u00e9sorerie."
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
    return { name: "Produit Scanné", category: "Divers" };
};

// --- ANALYTICS ---
export const generateSaaSInsights = async (tenants: Tenant[]): Promise<any> => {
    const fallback = { healthScore: 100, devRecommendation: "Mode Hors Ligne", riskAlert: "Aucun" };
    
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
        `Analyse business Maroc. Ventes: ${sales.length}. Cr\u00e9dit: ${customers.reduce((a,b)=>a+b.balance,0)}. Une phrase Darija.`,
        "L'activité est stable aujourd'hui. Lah yskher."
    );
};
