import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useTheme } from 'next-themes';
import * as React from 'react';
import { useRef } from 'react';

export interface SocialLink {
  id: string;
  url: string;
  icon: React.ReactNode;
  label: string;
}

export interface ProfileCardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** The full name of the individual. */
  name: string;
  /** The location, such as city and state. */
  location: string;
  /** A short biography or description. */
  bio: string;
  /** The source URL for the avatar image. */
  avatarSrc: string;
  /** Fallback text to display in the avatar (usually initials). */
  avatarFallback: string;
  /**
   * The color variant of the card content. Use 'on-accent' for text
   * that needs to be readable on a background matching the accent color.
   * @default 'default'
   */
  variant?: 'default' | 'on-accent';
  /** An array of social media links to display in the footer. */
  socials?: SocialLink[];
  /**
   * Controls the visibility of the avatar. If `false`, the avatar will be
   * invisible but still occupy space to prevent layout shifts.
   * @default true
   */
  showAvatar?: boolean;
  /** Optional inline styles for the main title element. */
  titleStyle?: React.CSSProperties;
  /** Optional inline styles for the root Card element. */
  cardStyle?: React.CSSProperties;
  /** Custom Tailwind classes for the location description text. */
  descriptionClassName?: string;
  /** Custom Tailwind classes for the main biography paragraph. */
  bioClassName?: string;
  /** Custom Tailwind classes for the footer container. */
  footerClassName?: string;
}

/**
 * A presentational component that displays the content of a user profile card.
 * It is designed to be composed within other components, such as an animation container.
 */
export const ProfileCardContent = React.forwardRef<
  HTMLDivElement,
  ProfileCardContentProps
>(
  (
    {
      className,
      name,
      location,
      bio,
      avatarSrc,
      avatarFallback,
      variant = 'default',
      socials = [],
      showAvatar = true,
      titleStyle,
      cardStyle,
      descriptionClassName,
      bioClassName,
      footerClassName,
      ...props
    },
    ref
  ) => {
    const isOnAccent = variant === 'on-accent';

    return (
      <Card
        ref={ref}
        className={cn('w-full max-w-sm border-none shadow-none', className)}
        style={cardStyle}
        {...props}
      >
        <CardHeader className="flex flex-row items-center gap-4">
          <div
            className={cn(
              'transition-opacity duration-300',
              showAvatar ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarSrc} alt={name} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex flex-col">
            <CardDescription className={cn(descriptionClassName)}>
              {location}
            </CardDescription>
            <CardTitle
              className={cn(isOnAccent && 'text-inherit')}
              style={titleStyle}
            >
              {name}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <p
            className={cn(
              'text-sm',
              isOnAccent ? 'text-inherit' : 'text-muted-foreground',
              bioClassName
            )}
          >
            {bio}
          </p>
        </CardContent>

        {socials.length > 0 && (
          <CardFooter className={cn(footerClassName)}>
            <div className="flex gap-3">
              {socials.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={cn(
                    'transition-opacity hover:opacity-70',
                    isOnAccent ? 'text-inherit' : 'text-muted-foreground'
                  )}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    );
  }
);
ProfileCardContent.displayName = 'ProfileCardContent';

export interface AnimatedProfileCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** The React node to display as the base layer of the card. */
  baseCard: React.ReactNode;
  /** The React node to display as the overlay layer, revealed on hover. */
  overlayCard: React.ReactNode;
  /**
   * The accent color used for the border and avatar ring.
   * Accepts any valid CSS color value.
   */
  accentColor?: string;
  /**
   * The color for primary text when on the accent background.
   * @default '#ffffff'
   */
  onAccentForegroundColor?: string;
  /**
   * The color for secondary/muted text when on the accent background.
   * @default 'rgba(255, 255, 255, 0.8)'
   */
  onAccentMutedForegroundColor?: string;
}

/**
 * A container component that creates a circular reveal animation on hover.
 * It composes two child components, a `baseCard` and an `overlayCard`,
 * to create the effect.
 */
export const AnimatedProfileCard = React.forwardRef<
  HTMLDivElement,
  AnimatedProfileCardProps
>(
  (
    {
      className,
      accentColor = 'hsl(var(--primary))',
      onAccentForegroundColor = '#ffffff',
      onAccentMutedForegroundColor = 'rgba(255, 255, 255, 0.8)',
      baseCard,
      overlayCard,
      ...props
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const { resolvedTheme } = useTheme();
    const overlayThemeClass = resolvedTheme === 'dark' ? 'light' : 'dark';

    const setContainerRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref]
    );

    const initialClipPath = 'circle(40px at 64px 64px)';
    const hoverClipPath = 'circle(150% at 64px 64px)';

    useGSAP(
      () => {
        gsap.set(overlayRef.current, { clipPath: initialClipPath });
      },
      { scope: containerRef }
    );
    
    const handleMouseEnter = () => {
      gsap.killTweensOf(overlayRef.current);
      gsap.to(overlayRef.current, {
        clipPath: hoverClipPath,
        duration: 0.7,
        ease: 'expo.inOut',
      });
    };
    
    const handleMouseLeave = () => {
      gsap.killTweensOf(overlayRef.current);
      gsap.to(overlayRef.current, {
        clipPath: initialClipPath,
        duration: 1.2,
        ease: 'expo.out(1, 1)',
      });
    };

    return (
      <div
        ref={setContainerRef}
        className={cn('group relative w-full max-w-sm cursor-pointer', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <div
          className="rounded-xl border-2 bg-card p-4 transition-colors duration-300"
          style={{ borderColor: accentColor }}
        >
          {baseCard}
        </div>

        <div
          ref={overlayRef}
          className={cn(
            'absolute inset-0 rounded-xl border-2 p-4',
            overlayThemeClass
          )}
          style={
            {
              borderColor: accentColor,
              backgroundColor: accentColor,
              '--on-accent-foreground': onAccentForegroundColor,
              '--on-accent-muted-foreground': onAccentMutedForegroundColor,
            } as React.CSSProperties
          }
        >
          {overlayCard}
        </div>
      </div>
    );
  }
);
AnimatedProfileCard.displayName = 'AnimatedProfileCard';
