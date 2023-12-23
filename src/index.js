export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const resoureName = url.pathname;
		console.log("ResourceName: ", resoureName);
		if (resoureName == undefined || resoureName == "" || resoureName == "/") {
			const html = `<!DOCTYPE html><body><p>Hello World</p></body>`;
			return new Response(html, {
				headers: {
					"content-type": "text/html;charset=UTF-8",
				},
			});
		}

		switch (request.method) {
			case 'GET':
				let object = await env.BLOG_PICTURE.get(resoureName);

				if (object === null) {
					const imageUrl = env.REMOTE_DATA_ADDRESS + "/" + resoureName;
					console.log("Path ", resoureName, " 不存在，从 OSS 拉取");
					const imageResponse = await fetch(imageUrl);
					if (imageResponse.status === 200) {
						console.log("Path ", resoureName, " 拉取成功，保存到 R2");
						const imageData = await imageResponse.arrayBuffer();
						await env.BLOG_PICTURE.put(resoureName, imageData);
						object = await env.BLOG_PICTURE.get(resoureName);
					}
				}

				if (object === null) {
					return new Response(undefined, { status: 404 })
				}

				const headers = new Headers();
				object.writeHttpMetadata(headers);
				headers.set('etag', object.httpEtag);

				return new Response(object.body, {
					headers,
				});

			default:
				return new Response('Method Not Allowed', {
					status: 405,
					headers: {
						Allow: 'GET',
					},
				});
		}
	},
};