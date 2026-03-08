'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log the error to console (could also send to error reporting service)
        console.error('ErrorBoundary caught an error:', error, errorInfo)
        this.setState({ errorInfo })
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    handleReload = (): void => {
        window.location.reload()
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI provided
            if (this.props.fallback) {
                return this.props.fallback
            }

            // Default fallback UI
            return (
                <div className="min-h-[400px] flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="text-destructive">Something went wrong</CardTitle>
                            <CardDescription>
                                An unexpected error occurred. Please try again.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <div className="bg-muted p-3 rounded-md text-sm font-mono overflow-auto max-h-32">
                                    <p className="text-destructive font-semibold">{this.state.error.message}</p>
                                    {this.state.errorInfo && (
                                        <pre className="text-muted-foreground text-xs mt-2 whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex gap-2">
                            <Button variant="outline" onClick={this.handleReset}>
                                Try Again
                            </Button>
                            <Button onClick={this.handleReload}>
                                Reload Page
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
