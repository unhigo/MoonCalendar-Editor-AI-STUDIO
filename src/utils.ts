export function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

export function generateStars(width: number, height: number, count: number) {
    return Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5,
        opacity: Math.random(),
    }));
}
