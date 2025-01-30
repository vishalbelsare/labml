## Nginx setup (optional)

### Install Nginx

```commandline
sudo apt install nginx
```

### Start Nginx

```commandline
systemctl start nginx
```

### Configuration

Generate a file called `labml_app.conf` within the `/etc/nginx/sites-available` directory, and include the following
content.

```nginx configuration
server {
        listen 80;
        listen <port>;
        server_name <server-ip>;

        location / {
               proxy_pass  http://127.0.0.1:<port>;
               proxy_set_header Host $http_host;
               proxy_set_header X-Real-IP $remote_addr;
               proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

}
```

Enable the file by creating a link to it within the `sites-enabled` directory.

```commandline
sudo ln -s /etc/nginx/sites-available/labml_app.conf /etc/nginx/sites-enabled/
```

Restart the `Nginx` service.

```commandline
sudo systemctl restart nginx
```

You can
follow [this guide](https://www.digitalocean.com/community/tutorials/how-to-improve-website-performance-using-gzip-and-nginx-on-ubuntu-20-04)
to configure `Nginx` to use `Gzip` for data compression.