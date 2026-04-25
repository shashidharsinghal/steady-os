UPDATE public.sales_orders
SET ordered_at = ((raw_data ->> 'Date')::timestamp AT TIME ZONE 'Asia/Kolkata')
WHERE source = 'petpooja'
  AND raw_data ? 'Date'
  AND raw_data ->> 'Date' ~ '^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$';
