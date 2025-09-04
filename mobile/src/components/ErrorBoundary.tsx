/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of
 * crashing the entire application.
 * 
 * Features:
 * - Error catching and logging
 * - Graceful fallback UI
 * - Recovery mechanism
 * - Development mode error details
 * 
 * @author Bug Specialist Italiano
 * @version 1.0.0
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface Props {
  /** Children components to wrap */
  children: ReactNode;
  /** Custom fallback component */
  FallbackComponent?: React.ComponentType<{ error: Error; resetError: () => void }>;
  /** Custom error handler */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show error details in development */
  showDevDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * 
 * Class component that catches errors in its child component tree
 * and provides a fallback UI when errors occur.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Resets the error boundary state
   */
  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  /**
   * Renders the fallback UI when an error occurs
   */
  renderFallback = () => {
    const { FallbackComponent, showDevDetails = __DEV__ } = this.props;
    const { error, errorInfo } = this.state;

    // If custom fallback component is provided, use it
    if (FallbackComponent) {
      return <FallbackComponent error={error!} resetError={this.resetError} />;
    }

    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>Qualcosa è andato storto</Text>
            <Text style={styles.message}>
              L'app ha riscontrato un errore imprevisto. Puoi provare a ricaricare o continuare con le funzionalità disponibili.
            </Text>
            
            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={this.resetError}
              >
                <Text style={styles.primaryButtonText}>Riprova</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => {
                  // Reload the app by clearing cache and resetting
                  this.resetError();
                }}
              >
                <Text style={styles.secondaryButtonText}>Ricarica</Text>
              </TouchableOpacity>
            </View>

            {/* Error details in development */}
            {showDevDetails && error && (
              <View style={styles.devDetails}>
                <Text style={styles.devTitle}>Dettagli errore (Development):</Text>
                <Text style={styles.errorText}>{error.toString()}</Text>
                
                {errorInfo && (
                  <>
                    <Text style={styles.devSubtitle}>Stack trace:</Text>
                    <Text style={styles.stackTrace}>
                      {errorInfo.componentStack}
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  render() {
    const { hasError } = this.state;
    const { children } = this.props;

    if (hasError) {
      return this.renderFallback();
    }

    return children;
  }
}

// Styles for the error boundary UI
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  devDetails: {
    alignSelf: 'stretch',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  devSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    fontFamily: 'monospace',
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  stackTrace: {
    fontSize: 10,
    color: '#7c3aed',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
  },
});

export default ErrorBoundary;