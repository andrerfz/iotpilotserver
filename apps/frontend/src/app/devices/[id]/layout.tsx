import DeviceLayout from '@/components/device-layout';

export default function DeviceLayoutRoute({
                                         children,
                                         params
                                     }: {
    children: React.ReactNode;
    params: { id: string };
}) {
    return <DeviceLayout params={params}>{children}</DeviceLayout>;
}
