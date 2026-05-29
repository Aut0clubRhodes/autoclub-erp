import ReturnConfirmClient from './return-confirm-client';

type ReturnConfirmPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const firstParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
};

export default async function ReturnConfirmPage({ searchParams }: ReturnConfirmPageProps) {
  const params = await searchParams;
  const reservationId =
    firstParam(params.id) ||
    firstParam(params.reservation_id) ||
    firstParam(params.reservationId);

  return <ReturnConfirmClient reservationId={reservationId} />;
}
