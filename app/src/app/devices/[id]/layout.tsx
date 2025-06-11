import DeviceLayout from '@/components/device-layout';

export default function DeviceLayoutRoute({
                                         children,
                                         params
                                     }: {
    children: React.ReactNode;
    params: { id: string };
}) {
    return <DeviceLayout children={children} params={params} />;
}
