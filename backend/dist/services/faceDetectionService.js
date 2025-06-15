"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFaceColors = analyzeFaceColors;
const sharp_1 = __importDefault(require("sharp"));
async function analyzeFaceColors(imagePath) {
    try {
        // For now, use skin tone estimation approach
        // This can be upgraded to full face detection later
        return await estimateSkinTonesFromImage(imagePath);
    }
    catch (error) {
        console.error('Face color analysis failed:', error);
        return null;
    }
}
async function estimateSkinTonesFromImage(imagePath) {
    // Get image data
    const { data: imageData, info } = await (0, sharp_1.default)(imagePath)
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .raw()
        .toBuffer({ resolveWithObject: true });
    const skinTones = extractSkinTones(imageData, info);
    const averageSkinTone = calculateAverageSkinTone(skinTones);
    // Comprehensive color analysis for different image regions
    const clothingColors = extractClothingColors(imageData, info);
    const hairColors = extractHairColors(imageData, info);
    const backgroundColors = extractBackgroundColors(imageData, info);
    const environmentalColors = extractEnvironmentalColors(imageData, info);
    // Estimate potential face regions (center and upper portions of image)
    const estimatedFaceRegions = [];
    if (skinTones.length > 0) {
        // Create estimated face regions based on skin tone distribution
        const centerRegion = {
            id: 1,
            skinTones: skinTones.slice(0, 5),
            dominantSkinColor: skinTones[0] || 'rgb(200,170,140)',
            regionColors: skinTones.slice(0, 3),
            confidence: 0.7 // Estimated confidence
        };
        estimatedFaceRegions.push(centerRegion);
    }
    return {
        faceCount: skinTones.length > 0 ? 1 : 0,
        faceRegions: estimatedFaceRegions,
        averageSkinTone,
        skinToneVariety: [...new Set(skinTones)].slice(0, 8),
        // Expanded color analysis
        clothingColors: clothingColors.slice(0, 8),
        hairColors: hairColors.slice(0, 6),
        backgroundColors: backgroundColors.slice(0, 6),
        environmentalColors: environmentalColors.slice(0, 10),
        dominantClothingColor: clothingColors[0] || '',
        dominantHairColor: calculateDominantHairColor(hairColors),
        dominantBackgroundColor: backgroundColors[0] || '',
        analysisType: 'skin-tone-estimation'
    };
}
function extractSkinTones(imageData, info) {
    const colorMap = new Map();
    const sampleStep = 8; // Sample every 8th pixel for performance
    // Focus on center regions where faces are more likely
    const centerX = Math.floor(info.width * 0.3);
    const centerY = Math.floor(info.height * 0.2);
    const regionWidth = Math.floor(info.width * 0.4);
    const regionHeight = Math.floor(info.height * 0.6);
    for (let y = centerY; y < centerY + regionHeight && y < info.height; y += sampleStep) {
        for (let x = centerX; x < centerX + regionWidth && x < info.width; x += sampleStep) {
            const pixelIndex = (y * info.width + x) * info.channels;
            const r = imageData[pixelIndex] || 0;
            const g = imageData[pixelIndex + 1] || 0;
            const b = imageData[pixelIndex + 2] || 0;
            // Check if this looks like a skin tone
            if (isSkinTone(r, g, b)) {
                const colorKey = `${Math.floor(r / 12) * 12},${Math.floor(g / 12) * 12},${Math.floor(b / 12) * 12}`;
                colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
            }
        }
    }
    // Return top skin tone colors
    return Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([color]) => `rgb(${color})`);
}
function isSkinTone(r, g, b) {
    // Enhanced skin tone detection algorithm
    // Based on research on skin color ranges across different ethnicities
    // Basic skin tone rules:
    // 1. Red channel should be dominant
    // 2. Green should be less than red but greater than blue
    // 3. Blue should be the lowest
    // 4. Overall brightness should be reasonable
    if (r < g || g < b)
        return false; // R > G > B rule
    // Brightness check
    const brightness = (r + g + b) / 3;
    if (brightness < 60 || brightness > 240)
        return false;
    // Color difference checks
    const rg_diff = r - g;
    const rb_diff = r - b;
    const gb_diff = g - b;
    // Skin tones typically have these characteristics
    if (rg_diff < 15 || rb_diff < 25)
        return false;
    if (gb_diff < 5)
        return false;
    // HSV-based checks for better skin detection
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    if (delta === 0)
        return false; // Avoid grayscale
    // Saturation check
    const saturation = delta / max;
    if (saturation < 0.1 || saturation > 0.8)
        return false;
    // Hue check (skin tones are typically in orange/red range)
    let hue = 0;
    if (max === r) {
        hue = 60 * (((g - b) / delta) % 6);
    }
    else if (max === g) {
        hue = 60 * (((b - r) / delta) + 2);
    }
    else {
        hue = 60 * (((r - g) / delta) + 4);
    }
    if (hue < 0)
        hue += 360;
    // Skin tones are typically between 0-50 degrees (red-orange range)
    return (hue >= 0 && hue <= 50) || (hue >= 300 && hue <= 360);
}
function calculateAverageSkinTone(skinTones) {
    if (skinTones.length === 0)
        return '';
    let totalR = 0, totalG = 0, totalB = 0;
    let count = 0;
    skinTones.forEach(color => {
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            totalR += parseInt(rgb[0]);
            totalG += parseInt(rgb[1]);
            totalB += parseInt(rgb[2]);
            count++;
        }
    });
    if (count === 0)
        return '';
    return `rgb(${Math.round(totalR / count)},${Math.round(totalG / count)},${Math.round(totalB / count)})`;
}
function calculateDominantHairColor(hairColors) {
    if (hairColors.length === 0)
        return '';
    // Group similar hair colors and find the most common category
    const hairCategories = new Map();
    hairColors.forEach(color => {
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            const r = parseInt(rgb[0]);
            const g = parseInt(rgb[1]);
            const b = parseInt(rgb[2]);
            const category = categorizeHairColor(r, g, b);
            if (!hairCategories.has(category)) {
                hairCategories.set(category, { count: 0, colors: [], representative: color });
            }
            const cat = hairCategories.get(category);
            cat.count++;
            cat.colors.push(color);
            // Update representative color to be the most common in this category
            if (cat.colors.length === 1 || cat.count === 1) {
                cat.representative = color;
            }
        }
    });
    // Return the representative color of the most common category
    const dominantCategory = Array.from(hairCategories.entries())
        .sort((a, b) => b[1].count - a[1].count)[0];
    return dominantCategory ? dominantCategory[1].representative : hairColors[0];
}
function categorizeHairColor(r, g, b) {
    const brightness = (r + g + b) / 3;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const saturation = max > 0 ? delta / max : 0;
    // Categorize hair colors into main types
    if (brightness < 60)
        return 'black';
    if (brightness < 100 && r >= g && g >= b)
        return 'dark-brown';
    if (brightness < 140 && r > g && g >= b && saturation > 0.15)
        return 'medium-brown';
    if (brightness < 180 && r > g && g > b)
        return 'light-brown';
    if (brightness >= 140 && r > g + 10 && g > b + 5)
        return 'blonde';
    if (r > g + 25 && r > b + 30)
        return 'red';
    if (brightness >= 80 && saturation < 0.12)
        return 'gray';
    if (brightness >= 200 && saturation < 0.08)
        return 'white';
    if (saturation > 0.3)
        return 'unusual';
    return 'brown'; // default
}
// Extract clothing colors from lower portion of image
function extractClothingColors(imageData, info) {
    const colorMap = new Map();
    const sampleStep = 6;
    // Focus on lower 60% of image where clothing is typically located
    const startY = Math.floor(info.height * 0.4);
    const endY = info.height;
    const startX = Math.floor(info.width * 0.2);
    const endX = Math.floor(info.width * 0.8);
    for (let y = startY; y < endY; y += sampleStep) {
        for (let x = startX; x < endX; x += sampleStep) {
            if (x >= info.width || y >= info.height)
                continue;
            const pixelIndex = (y * info.width + x) * info.channels;
            const r = imageData[pixelIndex] || 0;
            const g = imageData[pixelIndex + 1] || 0;
            const b = imageData[pixelIndex + 2] || 0;
            // Exclude skin tones from clothing analysis
            if (!isSkinTone(r, g, b) && !isLikelyHair(r, g, b)) {
                const colorKey = `${Math.floor(r / 15) * 15},${Math.floor(g / 15) * 15},${Math.floor(b / 15) * 15}`;
                colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
            }
        }
    }
    return Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([color]) => `rgb(${color})`);
}
// Extract hair colors from upper portion of image
function extractHairColors(imageData, info) {
    const colorMap = new Map();
    const sampleStep = 4; // Finer sampling for better accuracy
    // More focused hair regions - top center and upper sides
    const regions = [
        // Top center (crown/top of head)
        { startX: Math.floor(info.width * 0.3), endX: Math.floor(info.width * 0.7),
            startY: 0, endY: Math.floor(info.height * 0.25), weight: 2 },
        // Upper left side
        { startX: Math.floor(info.width * 0.1), endX: Math.floor(info.width * 0.4),
            startY: Math.floor(info.height * 0.1), endY: Math.floor(info.height * 0.4), weight: 1 },
        // Upper right side  
        { startX: Math.floor(info.width * 0.6), endX: Math.floor(info.width * 0.9),
            startY: Math.floor(info.height * 0.1), endY: Math.floor(info.height * 0.4), weight: 1 }
    ];
    for (const region of regions) {
        for (let y = region.startY; y < region.endY; y += sampleStep) {
            for (let x = region.startX; x < region.endX; x += sampleStep) {
                if (x >= info.width || y >= info.height)
                    continue;
                const pixelIndex = (y * info.width + x) * info.channels;
                const r = imageData[pixelIndex] || 0;
                const g = imageData[pixelIndex + 1] || 0;
                const b = imageData[pixelIndex + 2] || 0;
                // Enhanced hair detection with multiple approaches
                if (isLikelyHair(r, g, b) && !isSkinTone(r, g, b)) {
                    const colorKey = `${Math.floor(r / 8) * 8},${Math.floor(g / 8) * 8},${Math.floor(b / 8) * 8}`;
                    const currentCount = colorMap.get(colorKey) || 0;
                    colorMap.set(colorKey, currentCount + region.weight);
                }
            }
        }
    }
    return Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([color]) => `rgb(${color})`);
}
// Extract background colors from edges and corners
function extractBackgroundColors(imageData, info) {
    const colorMap = new Map();
    const sampleStep = 8;
    const edgeThickness = Math.floor(Math.min(info.width, info.height) * 0.15);
    // Sample from edges and corners
    for (let y = 0; y < info.height; y += sampleStep) {
        for (let x = 0; x < info.width; x += sampleStep) {
            // Check if pixel is in edge regions
            const isEdge = x < edgeThickness || x > info.width - edgeThickness ||
                y < edgeThickness || y > info.height - edgeThickness;
            if (isEdge) {
                const pixelIndex = (y * info.width + x) * info.channels;
                const r = imageData[pixelIndex] || 0;
                const g = imageData[pixelIndex + 1] || 0;
                const b = imageData[pixelIndex + 2] || 0;
                // Exclude skin tones and obvious foreground elements
                if (!isSkinTone(r, g, b)) {
                    const colorKey = `${Math.floor(r / 20) * 20},${Math.floor(g / 20) * 20},${Math.floor(b / 20) * 20}`;
                    colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
                }
            }
        }
    }
    return Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([color]) => `rgb(${color})`);
}
// Extract environmental colors (overall image excluding faces)
function extractEnvironmentalColors(imageData, info) {
    const colorMap = new Map();
    const sampleStep = 10;
    // Sample from entire image with lower resolution
    for (let y = 0; y < info.height; y += sampleStep) {
        for (let x = 0; x < info.width; x += sampleStep) {
            const pixelIndex = (y * info.width + x) * info.channels;
            const r = imageData[pixelIndex] || 0;
            const g = imageData[pixelIndex + 1] || 0;
            const b = imageData[pixelIndex + 2] || 0;
            // Include all colors for environmental analysis
            const colorKey = `${Math.floor(r / 25) * 25},${Math.floor(g / 25) * 25},${Math.floor(b / 25) * 25}`;
            colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
        }
    }
    return Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([color]) => `rgb(${color})`);
}
// Completely rewritten hair detection logic
function isLikelyHair(r, g, b) {
    const brightness = (r + g + b) / 3;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    // Calculate saturation and relative color values
    const saturation = max > 0 ? delta / max : 0;
    // 1. BLACK HAIR (very dark colors)
    if (brightness < 60 && delta < 25) {
        return true;
    }
    // 2. DARK BROWN HAIR
    if (brightness >= 30 && brightness < 100 &&
        r >= g && g >= b && r - b >= 15 && delta >= 20) {
        return true;
    }
    // 3. MEDIUM BROWN HAIR
    if (brightness >= 60 && brightness < 140 &&
        r > g && g >= b && r - b >= 20 && saturation > 0.15) {
        return true;
    }
    // 4. LIGHT BROWN HAIR
    if (brightness >= 100 && brightness < 180 &&
        r > g && g > b && r - b >= 15 && r - g < 40) {
        return true;
    }
    // 5. BLONDE HAIR (various shades)
    if (brightness >= 140 && brightness < 220) {
        // Golden blonde
        if (r > g + 10 && g > b + 5 && r - b >= 25)
            return true;
        // Ash blonde (more muted)
        if (Math.abs(r - g) < 20 && g > b + 10 && r - b >= 15)
            return true;
        // Platinum blonde (very light, low saturation)
        if (saturation < 0.15 && brightness > 180 && delta < 30)
            return true;
    }
    // 6. RED HAIR (various auburn shades)
    if (r > g + 25 && r > b + 30 && brightness >= 50 && brightness < 160) {
        return true;
    }
    // 7. GRAY/SILVER HAIR
    if (brightness >= 80 && brightness < 200 && saturation < 0.12 && delta < 25) {
        return true;
    }
    // 8. WHITE HAIR
    if (brightness >= 200 && saturation < 0.08 && delta < 20) {
        return true;
    }
    // 9. UNUSUAL COLORS (dyed hair - blues, purples, greens, etc.)
    if (saturation > 0.3 && brightness >= 40) {
        // Blue/purple hair
        if (b > r + 20 && b > g + 10)
            return true;
        // Green hair  
        if (g > r + 20 && g > b + 15)
            return true;
        // Pink/magenta hair
        if (r > g + 15 && r > b && b > g - 10)
            return true;
    }
    // 10. DIRTY BLONDE / DISHWATER BLONDE
    if (brightness >= 120 && brightness < 170 &&
        r > g && g > b && r - b >= 10 && r - b < 30 && saturation < 0.25) {
        return true;
    }
    return false;
}
//# sourceMappingURL=faceDetectionService.js.map