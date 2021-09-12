module.exports =
    /** @param {import("webpack").Configuration} config */ function (config) {
        const styleRules = config.module.rules.filter((rule) =>
            rule.test.toString().match(/css|less|s\(\[ac\]\)ss/)
        );

        styleRules.forEach((rule) => {
            console.log(rule);
            const uses = rule.use;
            if (!Array.isArray(uses)) {
                return;
            }

            const cssLoader = uses.find((use) => use.loader === "css-loader");
            if (typeof cssLoader === "object") {
                cssLoader.options = {
                    ...cssLoader.options,
                    esModule: true,
                    localsConvention: "camelCase",
                    modules: "local",
                    sourceMap: true,
                };
            }
        });

        return config;
    };
