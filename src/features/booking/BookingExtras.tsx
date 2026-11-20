import { useQuery } from '@tanstack/react-query';
import { Button, Notice } from '../../components/ui';
import { bookingPrice, euros } from '../../domain/rules';

export type Extra = { id: string; name: string; price: number; duration: number; active: boolean };
type Quote = {
  price: number;
  priceMax?: number | null;
  variantName?: string | null;
  duration: number;
  availableExtras: Extra[];
};

export function bookingParams(values: Record<string, string>, extras: string[]) {
  const params = new URLSearchParams(values);
  extras.forEach((id) => params.append('extraIds', id));
  return params;
}

export function useBookingQuote(
  path: string,
  token: string | null,
  params: URLSearchParams,
  enabled: boolean,
) {
  const selection = new URLSearchParams(params);
  selection.delete('extraIds');
  const serviceKey = selection.toString();
  return useQuery<Quote>({
    queryKey: ['booking-quote', path, token, serviceKey, params.toString()],
    enabled,
    gcTime: 0,
    retry: false,
    placeholderData: (previous, query) =>
      query?.queryKey[3] === serviceKey ? previous : undefined,
    queryFn: async ({ signal }): Promise<Quote> => {
      const response = await fetch(`${path}/quote?${params}`, {
        signal,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo calcular el precio y la duración.');
      return response.json();
    },
  });
}

export function BookingExtras({
  quote,
  selected,
  onChange,
}: {
  quote: ReturnType<typeof useBookingQuote>;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  if (quote.isError)
    return (
      <>
        <Notice error>{quote.error.message}</Notice>
        <Button
          type="button"
          variant="outline"
          onClick={() => (selected.length ? onChange([]) : void quote.refetch())}
        >
          {selected.length ? 'Quitar extras y recalcular' : 'Reintentar cálculo'}
        </Button>
      </>
    );
  if (!quote.data) return <p role="status">Calculando precio y duración…</p>;
  return (
    <>
      {quote.data.variantName && <p>Variante aplicada: {quote.data.variantName}</p>}
      {quote.data.availableExtras.length > 0 && (
        <fieldset>
          <legend>Extras opcionales</legend>
          {quote.data.availableExtras.map((extra) => (
            <label key={extra.id} className="checkbox-line">
              <input
                type="checkbox"
                checked={selected.includes(extra.id)}
                onChange={(event) => {
                  onChange(
                    event.target.checked
                      ? [...selected, extra.id]
                      : selected.filter((id) => id !== extra.id),
                  );
                }}
              />
              {extra.name} · {euros(extra.price)}
              {extra.duration > 0 && ` · +${extra.duration} min`}
            </label>
          ))}
        </fieldset>
      )}
      <p aria-live="polite">
        {quote.isPlaceholderData
          ? 'Recalculando precio y duración…'
          : `Total${quote.data.priceMax != null && quote.data.priceMax > quote.data.price ? ' orientativo' : ''}: ${bookingPrice(quote.data.price, quote.data.priceMax)} · ${quote.data.duration} min`}
      </p>
    </>
  );
}
