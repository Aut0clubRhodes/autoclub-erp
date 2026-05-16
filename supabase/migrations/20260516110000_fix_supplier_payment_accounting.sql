create or replace view public.supplier_ledger_view as
select
  s.id as supplier_id,
  s.name as supplier_name,
  coalesce(sum(
    case
      when t.type = 'expense'
       and t.payment_method = 'credit'
      then t.amount
      else 0
    end
  ), 0) as total_credit_charges,
  coalesce(sum(
    case
      when t.type = 'supplier_payment'
      then t.amount
      else 0
    end
  ), 0) as total_payments,
  coalesce(sum(
    case
      when t.type = 'expense'
       and t.payment_method = 'credit'
      then t.amount
      when t.type = 'supplier_payment'
      then -t.amount
      else 0
    end
  ), 0) as outstanding_balance
from public.suppliers s
left join public.transactions t
  on t.supplier_id = s.id
group by s.id, s.name
order by s.name;
