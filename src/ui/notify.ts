/** 
 * From https://codepen.io/shunty/pen/podKayQ
 * 
 * A 'toast'-like popup notification service. There are loads on GitHub etc but many
use JQuery and others don't play well with the Content-Security-Policy header so we'll make
our own. We can also cut out a lot of the options that many others provide because we're
going to fix the popup to be bottom right with fixed size etc (or bottom middle on 
narrower screens).
Based on:
https://github.com/CodeSeven/toastr/   // The original - but using JQuery
https://github.com/paper-development/vanilla-toasts
and closely based on:
https://codepen.io/mrtrimble/pen/mdEgzzR
https://webcodeflow.com/toast-notification-popup/

Changed the word 'toast' to 'notify' or 'notice' because Bootstrap contains several .toast styles
that conflict.

We use FontAwesome based icons and include 'fa' classes but FA isn't a dependency.
*/

// SVG icon data for each type of notification
// Copied from FontAwesome v5, https://fontawesome.com/
// https://github.com/FortAwesome/Font-Awesome/blob/5.x/metadata/icons.json
// fa-info-circle
const InfoPathData = 'M256 8C119.043 8 8 119.083 8 256c0 136.997 111.043 248 248 248s248-111.003 248-248C504 119.083 392.957 8 256 8zm0 110c23.196 0 42 18.804 42 42s-18.804 42-42 42-42-18.804-42-42 18.804-42 42-42zm56 254c0 6.627-5.373 12-12 12h-88c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h12v-64h-12c-6.627 0-12-5.373-12-12v-24c0-6.627 5.373-12 12-12h64c6.627 0 12 5.373 12 12v100h12c6.627 0 12 5.373 12 12v24z';
// fa-exclamation-triangle
const WarningPathData = 'M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.951 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z';
// fa-check-circle
const SuccessPathData = 'M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z';
// fa-exclamation-circle
const ErrorPathData = 'M504 256c0 136.997-111.043 248-248 248S8 392.997 8 256C8 119.083 119.043 8 256 8s248 111.083 248 248zm-248 50c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z';

// Timeouts - how long the notifications stay visible for
const DefaultFadeTimeout = 5000; // Time in ms before the notification is automatically removed
const WarnFadeTimeout = 6500; // Bit longer for warnings
const ErrorFadeTimeout = 8000; // Even longer for errors


export interface INotifyService {
    showInfo(title: string, message: string): void;
    showSuccess(title: string, message: string): void;
    showWarning(title: string, message: string): void;
    showError(title: string, message: string): void;
}

export class NotifyService implements INotifyService {
    public showInfo(title: string, message: string): void {
        this.showNotification(title, message, { messageType: NotifyMessageType.info });
    }

    public showSuccess(title: string, message: string): void {
        this.showNotification(title, message, { messageType: NotifyMessageType.success });
    }

    public showWarning(title: string, message: string): void {
        this.showNotification(title, message, { messageType: NotifyMessageType.warn });
    }

    public showError(title: string, message: string): void {
        this.showNotification(title, message, { messageType: NotifyMessageType.error });
    }

    private showNotification(title: string, message: string, options: NotifyOptions = { messageType: NotifyMessageType.info }): void {
        const opts = { ...DefaultNotifyOptions, ...options };
        const elem = this.createNotifyElement(title, message, opts);

        elem.classList.add("notice--active");
        const noticeTimeout = setTimeout(() => {
            elem.classList.remove("notice--active");
            this.removeNotice(elem);
        }, this.getTimeoutMS(opts.messageType ?? NotifyMessageType.info));
        elem.addEventListener("click", () => {
            elem.classList.remove("notice--active");
            // clearTimeout(noticeTimeout);
            this.removeNotice(elem);
        });
    }

    private removeNotice(notice: HTMLElement): void {
        setTimeout(() => { notice.remove(); }, 700);
    }

    private getTimeoutMS(msgType: NotifyMessageType): number {
        switch (msgType) {
            case NotifyMessageType.warn:
                return WarnFadeTimeout;
            case NotifyMessageType.error:
                return ErrorFadeTimeout;
            default:
                return DefaultFadeTimeout;
        }
    }

    private createNotifyElement(title: string, message: string, options: NotifyOptions): HTMLElement {
        // Find the existing notice container or create one if required
        const containers = document.querySelectorAll("section.notice-container");
        let sectionEl: HTMLElement;
        let sectionExists = false;
        if (containers.length > 0) {
            sectionEl = containers[0] as HTMLElement;
            sectionExists = true;
        } else {
            sectionEl = document.createElement("section");
            sectionEl.classList.add("notice-container");
        }

        const wrapperEl = document.createElement("div");
        wrapperEl.classList.add("notice");
        wrapperEl.setAttribute("role", "alert");
        wrapperEl.setAttribute("aria-live", "assertive");
        wrapperEl.setAttribute("aria-atomic", "true");

        switch (options.messageType) {
            case NotifyMessageType.info:
                wrapperEl.classList.add("notice-type-info")
                break;
            case NotifyMessageType.success:
                wrapperEl.classList.add("notice-type-success")
                break;
            case NotifyMessageType.warn:
                wrapperEl.classList.add("notice-type-warn")
                break;
            case NotifyMessageType.error:
                wrapperEl.classList.add("notice-type-error")
                break;
            default:
                throw `Don't know how to configure popup with message type ${options.messageType}`;
        }

        const iconEl = document.createElement("div");
        iconEl.classList.add("notice-icon");

        const iconSvg = this.getSVGElement(options.messageType);

        const contentEl = document.createElement("div")
        contentEl.classList.add("notice-content");

        const titleEl = document.createElement("h2");
        titleEl.classList.add("notice-title");
        titleEl.innerHTML = title || "";

        const messageEl = document.createElement("p");
        messageEl.classList.add("notice-message");
        messageEl.innerHTML = message;

        iconEl.append(iconSvg);
        wrapperEl.append(iconEl);
        contentEl.append(titleEl);
        contentEl.append(messageEl);
        wrapperEl.append(contentEl);
        sectionEl.append(wrapperEl);

        // Add the notice container if necessary
        if (!sectionExists) {
            document.getElementsByTagName("body")[0].append(sectionEl);
        }
        // Return the main notice element
        return wrapperEl;
    }

    private getSVGElement(messageType: NotifyMessageType): SVGSVGElement {
        const result = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        result.setAttribute("aria-hidden", "true");
        result.setAttribute("focusable", "false");
        result.setAttribute("data-prefix", "fas");
        result.setAttribute("role", "img");
        if (messageType === NotifyMessageType.warn) {
          result.setAttribute("viewBox", "0 0 580 512");
        } else {          
          result.setAttribute("viewBox", "0 0 512 512");
        }
        result.classList.add("svg-inline--fa", "fa-2x", "fa-w-16");

        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("fill", "currentColor");

        let d, icon;
        switch (messageType) {
            case NotifyMessageType.info:
                d = InfoPathData;
                icon = "info-circle";
                break;
            case NotifyMessageType.success:
                d = SuccessPathData;
                icon = "check-circle";
                break;
            case NotifyMessageType.warn:
                d = WarningPathData;
                icon = "exclamation-triangle";
                break;
            case NotifyMessageType.error:
                d = ErrorPathData;
                icon = "exclamation-circle";
                break;
            default:
                throw `Don't know how to provide SVG with message type ${messageType}`;
        }

        result.setAttribute("data-icon", icon);
        result.classList.add(`fa-${icon}`);
        pathEl.setAttribute("d", d);
        result.append(pathEl);
        return result;
    }
}

export interface NotifyOptions {
    messageType?: NotifyMessageType;
}

export enum NotifyMessageType {
    info,
    success,
    warn,
    error,
}

const DefaultNotifyOptions: NotifyOptions = {
    messageType: NotifyMessageType.info,
};
