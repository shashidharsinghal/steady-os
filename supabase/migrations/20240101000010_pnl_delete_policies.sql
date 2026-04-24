CREATE POLICY "pnl_reports_delete"
  ON public.pnl_reports FOR DELETE
  USING (public.is_partner(auth.uid()));

CREATE POLICY "pnl_expense_lines_delete"
  ON public.pnl_expense_lines FOR DELETE
  USING (public.is_partner(auth.uid()));
