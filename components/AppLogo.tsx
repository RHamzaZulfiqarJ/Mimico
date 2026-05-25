import Image from "next/image";

type AppLogoProps = {
    size?: "sm" | "md" | "lg";
    className?: string;
};

const sizes = {
    sm: {
        box: "h-8 w-8",
        image: "h-6 w-6",
        width: 24,
        height: 24,
    },
    md: {
        box: "h-10 w-10",
        image: "h-8 w-8",
        width: 32,
        height: 32,
    },
    lg: {
        box: "h-12 w-12",
        image: "h-10 w-10",
        width: 40,
        height: 40,
    },
};

export default function AppLogo({ size = "md", className = "" }: AppLogoProps) {
    const selectedSize = sizes[size];

    return (
        <span
            className={`flex ${selectedSize.box} items-center justify-center overflow-hidden rounded-md ${className}`}
        >
            <Image
                src="/android-chrome-192x192.png"
                alt="MIMICO Logo"
                width={selectedSize.width}
                height={selectedSize.height}
                className={`${selectedSize.image} object-contain`}
                priority
            />
        </span>
    );
}
