import React, { useCallback } from "react";
import type { FileRejection } from "react-dropzone";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";

import style from "./Dropzone.module.scss";

interface DropzoneProps {
    accept?: string[] | string | undefined;
    onDrop: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ accept, onDrop }) => {
    const { t } = useTranslation();
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept,
        onDrop,
    });

    const getClassName = useCallback((className: string, isActive: boolean) => {
        if (!isActive) return className;
        return `${style["dropzone-area"]} ${style["dropzone-area--active"]}`;
    }, []);

    return (
        <div className={style.dropzone}>
            <div className={style["dropzone-title"]}>
                <h1 todo-i18n="true">{t("dropzone.download-here")}</h1>
                <span todo-i18n="true">{t("dropzone.pst-limitation")}</span>
            </div>
            <div
                className={getClassName(style["dropzone-area"]!, isDragActive)}
                {...getRootProps()}
            >
                <input
                    className="dropzone-input"
                    {...getInputProps({ multiple: false })}
                />
                <div className={style["dropzone-text"]}>
                    {isDragActive ? (
                        <p className="dropzone-text-item" todo-i18n="true">
                            {t("dropzone.drop")}
                        </p>
                    ) : (
                        <p className="dropzone-text-item" todo-i18n="true">
                            {t("dropzone.click-or-drag")}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
