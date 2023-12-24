export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const resoureName = url.pathname;
		let result = "";
		console.log("ResourceName: ", resoureName);
		if (resoureName == undefined || resoureName == "" || resoureName == "/") {
			result = "ROOT_PATH";
			const html = `<!DOCTYPE html><body><p>Hello World</p></body>`;
			await record(env, request, resoureName, result);
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
						result = "OSS";
						console.log("Path ", resoureName, " 拉取成功，保存到 R2");
						const imageData = await imageResponse.arrayBuffer();
						await env.BLOG_PICTURE.put(resoureName, imageData);
						object = await env.BLOG_PICTURE.get(resoureName);
					}
				} else {
					result = "R2";
				}

				if (object === null) {
					result = "NOT_EXIST";
					await record(env, request, resoureName, result);
					return new Response(undefined, { status: 404 })
				}
				await record(env, request, resoureName, result);

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

async function record(env, request, resourceName, result) {
	console.log("写入数据: ", resourceName, " Result: ", result);
	env.PICTURE_ANALYSIS.writeDataPoint({
		'blobs': [
			request.cf.colo,
			request.cf.country,
			request.cf.city,
			request.cf.region,
			request.cf.timezone,
			resourceName,
			result
		],
		'doubles': [
			request.cf.metroCode,
			request.cf.longitude,
			request.cf.latitude
		],
		'indexes': [
			request.cf.postalCode
		]
	});
}