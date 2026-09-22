<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use SocialiteProviders\Manager\SocialiteWasCalled;
use SocialiteProviders\Steam\SteamExtendSocialite;
use SocialiteProviders\Discord\DiscordExtendSocialite;
use SocialiteProviders\GitHub\GitHubExtendSocialite;
use SocialiteProviders\Google\GoogleExtendSocialite;
use SocialiteProviders\VKontakte\VKontakteExtendSocialite;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Event::listen(SocialiteWasCalled::class, function (SocialiteWasCalled $event) {
            $event->extendSocialite('steam', SteamExtendSocialite::class);
            $event->extendSocialite('discord', DiscordExtendSocialite::class);
            $event->extendSocialite('github', GitHubExtendSocialite::class);
            $event->extendSocialite('google', GoogleExtendSocialite::class);
            $event->extendSocialite('vkontakte', VKontakteExtendSocialite::class);
        });
    }
}
