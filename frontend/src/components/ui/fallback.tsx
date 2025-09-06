import { AlertCircle, Image, FileText } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function AIFeatureFallback() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        AI feature temporarily unavailable. This helps keep the page loading fast.
        <Button 
          variant="link" 
          className="p-0 h-auto ml-2"
          onClick={() => window.location.reload()}
        >
          Refresh to try again
        </Button>
      </AlertDescription>
    </Alert>
  )
}

export function EditorFallback() {
  return (
    <div className="border rounded-lg p-8 text-center space-y-4">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
      <div>
        <h3 className="font-medium">Rich Text Editor</h3>
        <p className="text-sm text-muted-foreground">Loading advanced editing features...</p>
      </div>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Refresh if loading fails
      </Button>
    </div>
  )
}

export function ImageFeatureFallback() {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center space-y-4">
      <Image className="h-12 w-12 mx-auto text-muted-foreground" />
      <div>
        <h3 className="font-medium">Image Processing</h3>
        <p className="text-sm text-muted-foreground">Advanced image features are loading...</p>
      </div>
      <Button variant="outline" onClick={() => window.location.reload()}>
        Refresh if needed
      </Button>
    </div>
  )
}
