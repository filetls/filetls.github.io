// Listen for an opened directory
let directory;

self.addEventListener("message", function(message) {

    directory = message.data;

});

// Listen for fetch events
self.addEventListener("fetch", function(event) {

    // Get the URL
    const url = new URL(event.request.url);

    // Don't overwrite cross-site requests, filetls.html, and ?overwritefiletls=1
    if (url.pathname == "/filetls.html" || url.hostname != location.hostname || url.searchParams.get("overwritefiletls") == "1") {
        
        // Respond with the real file
        event.respondWith(fetch(event.request.url, {mode: "no-cors"}));

        // Cancel other logic
        return;
        
    }

    // This line is required because there is asynchronous code
    event.respondWith(new Promise(async function(resolve) {

        // Catch errors
        try {

            // Use slice to remove empty string from array
            const path = url.pathname.split("/").slice(1);
    
            // Get the file name
            const file = path.pop();
    
            // Find the file data
            let data = directory;
    
            for (part of path) {
    
                data = await data.getDirectoryHandle(part);
    
            };
    
            // Automate index.html load
            try {

                data = await data.getFileHandle(file);

            } catch {

                const folder = await data.getDirectoryHandle(file);

                data = await folder.getFileHandle("index.html");

            }
    
            // Create the response
            resolve(new Response(await data.getFile(), {status: 200, statusText: "OK"}));

        } catch(error) {

            // Warn about the error in the console
            console.warn(error);

            // Create an HTML response Headers object
            const headers = new Headers();

            headers.append("Content-Type", "text/html");

            // Create the reponse data
            const data = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Not Found</title>

                    <style>

                    body {
                        display: flex;
                        flex-direction: column;
                        background: #000000;
                        color: #ffffff;
                        font-family: sans-serif;
                        font-size: 1.5rem;
                        line-height: 2em;
                        margin: 0;
                        padding: 1em;
                        height: 100vh;
                        box-sizing: border-box;
                    }

                    #stack {
                        white-space: pre-line;
                        flex-grow: 1;
                        outline: 2px solid #ffffff;
                        padding: 0.5em;
                        box-sizing: border-box;
                        overflow: auto;
                    }

                    h1, a {
                        color: #00ff00;
                    }

                    </style>
                </head>
                <body>
                    <h1>404 Not Found</h1>
                    <p>An error has occurred: Uncaught ${error.name}: ${error.message}</p>
                    <div id="stack"></div>
                    <p>Open the console with <b>Ctrl Shift J</b> or <b>Cmd Shift J</b> for more details. Also, enable preserve log and reload if necessary.</p>
                    <ul>
                        <li><a href="javascript:void(0)" id="overwrite">Overwrite and fetch normally</a></li>
                        <li><a href="javascript:void(0)" id="index">Try index.html</a></li>
                        <li><a href="/filetls.html">Back to FileTLS home</a></li>
                    </ul>
                    <script>

                        // Add the stack to the stack element
                        const stack = document.querySelector("#stack");

                        stack.innerText = \`${error.stack}\`;

                        // Try index.html link
                        const index = document.querySelector("#index");

                        index.addEventListener("click", function() {

                            let path = location.pathname + "/index.html";

                            if (location.pathname == "/") path = "/index.html";

                            location.pathname = path;

                        });

                        // Overwrite and fetch normally link
                        const overwrite = document.querySelector("#overwrite");

                        overwrite.addEventListener("click", function() {

                            // location.searchParams doesn't exist
                            const url = new URL(location.href);

                            url.searchParams.append("overwritefiletls", "1");

                            // Update location to url
                            location.href = url.href;

                        });

                    </script>
                </body>
                </html>
            `

            // Repond
            resolve(new Response(data, {status: 404, statusText: "Not Found", headers: headers}));
        }

    }));

});
