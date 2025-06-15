'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImageUploader } from '@/components/image/ImageUploader'
import { Badge } from '@/components/ui/badge'
import { X, Wand } from 'lucide-react'
import { ProgressCircle } from '@/components/ui/progress-circle'
import { Button } from '@/components/ui/button'
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { getProxiedImageUrl } from '@/lib/imageProxy'

interface SeoMetadata {
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string[]
  canonicalUrl?: string
  ogImage?: string
}

interface SeoMetadataEditorProps {
  value: SeoMetadata
  onChange: (metadata: SeoMetadata) => void
  content?: string
  title?: string
  excerpt?: string
}

export function SeoMetadataEditor({
  value,
  onChange,
  content,
  title,
  excerpt
}: SeoMetadataEditorProps) {
  const [metaTitle, setMetaTitle] = useState(value.metaTitle || '')
  const [metaDescription, setMetaDescription] = useState(value.metaDescription || '')
  const [metaKeywordsInput, setMetaKeywordsInput] = useState('')
  const [metaKeywords, setMetaKeywords] = useState<string[]>(value.metaKeywords || [])
  const [canonicalUrl, setCanonicalUrl] = useState(value.canonicalUrl || '')
  const [ogImage, setOgImage] = useState(value.ogImage || '')
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([])
  
  const [titleScore, setTitleScore] = useState(0)
  const [descriptionScore, setDescriptionScore] = useState(0)
  
  // Ref to track previous values to avoid unnecessary updates
  const prevValuesRef = useRef({
    metaTitle,
    metaDescription,
    metaKeywords,
    canonicalUrl,
    ogImage
  })
  
  // Ref to track if we've already set initial defaults
  const initialMountRef = useRef(true)
  
  // Use title as default for meta title, but only on initial mount
  useEffect(() => {
    if (initialMountRef.current) {
      if (!metaTitle && title) {
        setMetaTitle(title)
      }
      initialMountRef.current = false
    }
  }, [title, metaTitle])
  
  // Ensure empty strings are handled correctly in the onChange notification
  useEffect(() => {
    const prevValues = prevValuesRef.current;
    
    // Check if any values have changed - treat empty strings as valid values
    const hasChanged = 
      prevValues.metaTitle !== metaTitle ||
      prevValues.metaDescription !== metaDescription ||
      prevValues.metaKeywords !== metaKeywords ||
      prevValues.canonicalUrl !== canonicalUrl ||
      prevValues.ogImage !== ogImage;
    
    // Only call onChange if values have changed
    if (hasChanged) {
      // Update ref with current values
      prevValuesRef.current = {
        metaTitle,
        metaDescription,
        metaKeywords,
        canonicalUrl,
        ogImage
      };
      
      // Notify parent - explicitly handle empty strings
      onChange({
        metaTitle: metaTitle,
        metaDescription: metaDescription,
        metaKeywords,
        canonicalUrl,
        ogImage
      });
    }
  }, [metaTitle, metaDescription, metaKeywords, canonicalUrl, ogImage, onChange]);
  
  // Initialize from props if they change (only run on initial render and prop changes)
  useEffect(() => {
    // Allow empty strings from parent to override local state
    if (value.metaTitle !== undefined && value.metaTitle !== metaTitle) 
      setMetaTitle(value.metaTitle);
    
    if (value.metaDescription !== undefined && value.metaDescription !== metaDescription) 
      setMetaDescription(value.metaDescription);
    
    if (value.metaKeywords !== undefined && JSON.stringify(value.metaKeywords) !== JSON.stringify(metaKeywords)) 
      setMetaKeywords(value.metaKeywords);
    
    if (value.canonicalUrl !== undefined && value.canonicalUrl !== canonicalUrl) 
      setCanonicalUrl(value.canonicalUrl);
    
    if (value.ogImage !== undefined && value.ogImage !== ogImage) 
      setOgImage(value.ogImage);
      
    // Update ref with initial values
    prevValuesRef.current = {
      metaTitle: value.metaTitle || metaTitle,
      metaDescription: value.metaDescription || metaDescription,
      metaKeywords: value.metaKeywords || metaKeywords,
      canonicalUrl: value.canonicalUrl || canonicalUrl,
      ogImage: value.ogImage || ogImage
    };
  }, [value]);
  
  // Calculate SEO score for title
  useEffect(() => {
    // Title should be 50-60 characters
    const length = metaTitle.length
    
    if (length === 0) {
      setTitleScore(0)
    } else if (length < 30) {
      setTitleScore(30)
    } else if (length < 50) {
      setTitleScore(70)
    } else if (length <= 60) {
      setTitleScore(100)
    } else if (length <= 70) {
      setTitleScore(70)
    } else {
      setTitleScore(30)
    }
  }, [metaTitle])
  
  // Calculate SEO score for description
  useEffect(() => {
    // Description should be 120-155 characters
    const length = metaDescription.length
    
    if (length === 0) {
      setDescriptionScore(0)
    } else if (length < 80) {
      setDescriptionScore(30)
    } else if (length < 120) {
      setDescriptionScore(70)
    } else if (length <= 155) {
      setDescriptionScore(100)
    } else if (length <= 170) {
      setDescriptionScore(70)
    } else {
      setDescriptionScore(30)
    }
  }, [metaDescription])
  
  // Add keyword
  const handleAddKeyword = () => {
    if (metaKeywordsInput.trim()) {
      // Split by comma and clean up
      const newKeywords = metaKeywordsInput
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)
        .filter(k => !metaKeywords.includes(k))
      
      setMetaKeywords([...metaKeywords, ...newKeywords])
      setMetaKeywordsInput('')
    }
  }
  
  // Remove keyword
  const handleRemoveKeyword = (keyword: string) => {
    setMetaKeywords(metaKeywords.filter(k => k !== keyword))
  }
  
  // Handle pressing Enter in keywords input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword()
    }
  }
  
  // Extract keywords from content
  const extractKeywords = useCallback(() => {
    if (!content || content.length < 100) return;
    
    // Remove HTML tags and get plain text
    const plainText = content.replace(/<[^>]*>/g, ' ');
    
    // Common stop words to exclude
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'to', 'from', 'in', 'out', 'on', 'off', 'over', 'under', 'again',
      'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
      'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
      'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
      'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
    ]);
    
    // Split text into words, convert to lowercase
    const words = plainText.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3) // Only words longer than 3 chars
      .filter(word => !stopWords.has(word)) // Remove stop words
      .map(word => word.replace(/[^a-z0-9]/g, '')); // Remove special chars
    
    // Count word frequency
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      if (word) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    // Convert to array, sort by frequency, and take top 10
    const sortedWords = Object.entries(wordCounts)
      .filter(([word, count]) => count > 1 && word.length > 3) // Only frequent words
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    // Add bigrams (two-word phrases)
    const bigrams: Record<string, number> = {};
    for (let i = 0; i < words.length - 1; i++) {
      if (words[i] && words[i+1]) {
        const bigram = `${words[i]} ${words[i+1]}`;
        bigrams[bigram] = (bigrams[bigram] || 0) + 1;
      }
    }
    
    const sortedBigrams = Object.entries(bigrams)
      .filter(([phrase, count]) => count > 1) // Only frequent phrases
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase]) => phrase);
    
    // Combine words and bigrams, remove any that are already in metaKeywords
    const combined = [...sortedWords, ...sortedBigrams]
      .filter(keyword => !metaKeywords.includes(keyword));
    
    setSuggestedKeywords(combined);
  }, [content, metaKeywords]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${
                metaTitle.length > 70 ? 'text-destructive' :
                metaTitle.length > 60 ? 'text-amber-500' :
                'text-muted-foreground'
              }`}>
                {metaTitle.length}/60
              </span>
              <ProgressCircle value={titleScore} size="small" />
            </div>
          </div>
          <Input
            id="metaTitle"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="Title for search engines (50-60 characters recommended)"
            maxLength={70}
            className={`${
              metaTitle.length > 70 ? 'border-destructive' :
              metaTitle.length > 60 ? 'border-amber-500' : ''
            }`}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${
                metaDescription.length > 170 ? 'text-destructive' :
                metaDescription.length > 155 ? 'text-amber-500' :
                'text-muted-foreground'
              }`}>
                {metaDescription.length}/155
              </span>
              <ProgressCircle value={descriptionScore} size="small" />
            </div>
          </div>
          <Textarea
            id="metaDescription"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Description for search engines (120-155 characters recommended)"
            maxLength={170}
            className={`resize-none h-20 ${
              metaDescription.length > 170 ? 'border-destructive' :
              metaDescription.length > 155 ? 'border-amber-500' : ''
            }`}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="metaKeywords">Meta Keywords</Label>
          <div className="flex gap-2">
            <Input
              id="metaKeywords"
              value={metaKeywordsInput}
              onChange={(e) => setMetaKeywordsInput(e.target.value)}
              placeholder="Add keywords, separated by commas"
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              onClick={handleAddKeyword}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Add
            </button>
          </div>
          
          {content && (
            <Button
              type="button"
              onClick={extractKeywords}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <Wand className="h-4 w-4 mr-2" />
              Generate keywords from content
            </Button>
          )}
          
          {suggestedKeywords.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Suggested keywords:</p>
              <div className="flex flex-wrap gap-1">
                {suggestedKeywords.map((keyword) => (
                  <Badge 
                    key={keyword} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary/10"
                    onClick={() => {
                      if (!metaKeywords.includes(keyword)) {
                        setMetaKeywords([...metaKeywords, keyword]);
                        setSuggestedKeywords(suggestedKeywords.filter(k => k !== keyword));
                      }
                    }}
                  >
                    + {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {metaKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {metaKeywords.map((keyword) => (
                <Badge key={keyword} className="flex items-center gap-1 pl-2 pr-1 py-1.5">
                  {keyword}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="ml-1 rounded-full hover:bg-primary/20 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="canonicalUrl">Canonical URL</Label>
          <Input
            id="canonicalUrl"
            value={canonicalUrl}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            placeholder="https://example.com/blog/post-slug"
          />
          <p className="text-xs text-muted-foreground">
            Use this to specify the preferred URL for search engines
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="ogImage">Social Media Image</Label>
          <ImageUploader
            value={ogImage}
            onChange={(url) => {
              // For OG images (used in public meta tags), use the proxied URL to hide backend
              const proxiedUrl = getProxiedImageUrl(url)
              const finalUrl = proxiedUrl || url
              setOgImage(finalUrl)
              console.log(`[SEO Editor] Setting OG image (proxied): ${finalUrl}`)
            }}
            label="Select image for social media sharing"
          />
          <p className="text-xs text-muted-foreground">
            This image will be used when your post is shared on social media (1200×630 pixels recommended)
          </p>
        </div>
        
        <div className="p-4 bg-muted rounded-md mt-4">
          <h3 className="text-sm font-medium mb-2">SEO Preview</h3>
          <div className="space-y-1">
            <p className="text-blue-600 text-base font-medium line-clamp-1">{metaTitle || 'Title goes here'}</p>
            <p className="text-green-700 text-xs">{canonicalUrl || 'example.com/blog/post'}</p>
            <p className="text-sm text-neutral-700 line-clamp-2">{metaDescription || 'Your meta description will appear here...'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 