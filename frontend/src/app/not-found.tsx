import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-auto text-center p-6">
        <div className="mb-8">
          <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
            404
          </div>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-purple-600 mx-auto rounded-full"></div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Page Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist. Try our image tools instead!
        </p>

        <div className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="/image/compress">
              <Search className="w-4 h-4 mr-2" />
              Try Image Tools
            </Link>
          </Button>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Popular Tools
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link href="/image/compress" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
              Compress
            </Link>
            <Link href="/image/resize" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
              Resize
            </Link>
            <Link href="/image/convert" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
              Convert
            </Link>
            <Link href="/image/crop" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">
              Crop
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
