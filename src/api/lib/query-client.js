import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';


export const queryClientInstance = new QueryClient({
	mutationCache: new MutationCache({
		onError: error => toast.error(error.response?.data?.error || 'We could not save your changes. Please try again.'),
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
