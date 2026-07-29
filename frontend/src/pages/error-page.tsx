import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

export function ErrorPage() {
  const error = useRouteError();
  const isError = isRouteErrorResponse(error);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <span className="text-2xl text-destructive">!</span>
      </div>
      <h1 className="text-2xl font-semibold text-foreground">
        {isError ? error.status : 'Unexpected Error'}
      </h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {isError
          ? error.statusText
          : 'An unexpected error occurred. The error has been logged and our team has been notified.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-dark"
      >
        Reload Application
      </button>
    </div>
  );
}
