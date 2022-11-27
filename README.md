# Using FastAPI on Lambda - Demo Application


## Summary

A demo React application using a FastAPI backend running on AWS Lambda with a Snowflake database. 

*The main reason for choosing Snowflake was a convenience - a sample database provided with Snowflake trial account was sufficient.*


## Requirements

- To run locally
    - Node installed (tested using Node v18)
    - a Snowflake account (trial account is sufficient)
        - import a sample database shared by by SFC_SAMPLES account, name it `SAMPLE_DATA` (that is the default name used in `config.sh`, you need to change it if you use a different name)
        - create a Warehouse, X-Small is enough. Demo is expecting one named `COMPUTE_WH` (any other name will require an envrionmental variable change in `config.sh`)

- To deploy to AWS Lambda
    - `docker` installed (and running if you are on Mac). `snowflake-connector` Python library caused an `invalid ELF header` error when I tried deploying the backend packages on MacOS straight to AWS Lambda, so I had to use Docker to create a suitable deployment package to prevent that. You can find more information about the issue in https://tg4.solutions/how-to-resolve-invalid-elf-header-error/. Not sure how it works on Windows, only tested on Mac
    - access to AWS environment with ability to crete a Lambda function 
    - there are several ways to deploy Lambda code to AWS. I used AWS CLI here, so you if have/can have AWS CLI installed and configured then you can follow the deployment steps suggested here, otherwise you can use AWS Console to achieve the same results (or use other means to achieve the same)
    - access to some S3 bucket for lambda deployement. The same, or some other S3 bucket can be used to host the React application if you don't want to run it locally (good for different devices/users - I used a pre-signed URLs to run the application staight from non-public S3 bucket to avoid exposing the frontend application to public as I did not implement a proper backend authentication)

**Note**

For simplicity, I used a fixed token for authorization which is OK for a simple demo that uses ephemeral resources (tokens are an ephemeral concent after all, so technically you can use the same token if the rest of your solution is ephemeral and not easily discoverable). DO NOT use this approach for long-running application, implement a proper authorization process.

## Running locally

- Set the environmental variable values in the `config.sh` (replace values enclosed in `<...>` with your values)

- In the Terminal window, run the configuratation before anything
```
source config.sh
```

### Backend

- Environment setup

*This as tested with Python 3.8 as it was the latest version supported by Lambda at the time this was developed. Also, I had to fix the library versions in the `requirements.txt` because a subsequent attempt to run everyting 3 montnhs after the initial development was breaking a Lambda function with some `Criptography` library dependencies.*

 ***I used `pyenv` to manage Python versions***

```
pyenv install 3.8.14
pyenv pyenv shell 3.8.14

pip install virtualenv

python -m virtualenv fast-api-demo-env
source fast-api-demo-env/bin/activate
```

- Install dependencies
```
pip install -r backend/requirements.txt
```

- Local run
```
(cd backend; uvicorn main:app --reload)
```


### Frontend

- If necessary, change the values in the `frontend/.env` file
    - Change `REACT_APP_API_URL` if the value does not match the address of the backend started earlier 
    - change the `REACT_APP_API_TOKEN` if you want to use a different token (in which case you also have to change the value of `FAST_API_DEMO_TOKEN` in the `config.sh`)

***In a new terminal window***

- Install - first time only (or after making changes to `frontend/package.json`)
```
(cd frontend; npm install)
```

- Run
```
(cd frontend; npm start)
```

A web page showing the application architecture should open in a browser (browse to http://localhost:3000/ if it doesn't). Click on `Show Top Customers` and explore the rest.


## Deployment

- Modify variables in `lambda_config.sh` to match your environment (set at least the AWS S3 bucket name) and run the script

```
source lambda_config.sh
```

### Build a base zip file for AWS Lambda deployment

***You only need to do this once. Reason for doing so is expalained in the Requirements section. Alternatively, you can skip this section and use the ZIP file I included in the repository under `backend`***

- Launch the docker image
```
BUILD_DIR=ubuntu_build
mkdir $BUILD_DIR
cp backend/requirements.txt $BUILD_DIR
docker run -v `pwd`/$BUILD_DIR:/lambda -it --rm ubuntu
```

In the docker command prompt

- Update the image and install some libraries
```
apt-get update
apt install curl -y
apt install software-properties-common -y
add-apt-repository ppa:deadsnakes/ppa -y
apt update
```

- Install a specific version of Python (match the Python version that you used, I used 3.9)

***I am using Python 3.8, modify the commands accordingly if using a different version***

```
apt install python3.8 -y
apt install python3.8-distutils -y
python3.8 --version
```

You should see the Python version you wanted to install

- Install PIP
```
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python3.8 get-pip.py
```

- Download the Python libraries 
```
cd lambda
python3.8 -m pip install -t lib -r requirements.txt
```

- Exit the docker prompt
```
exit
```

- Back in the non-docker command prompt, package the libraries 

(cd $BUILD_DIR/lib; zip ../../backend/$ZIP_NAME -ru .)


### Add the Lambda function code to zip

```
(cd backend; zip $ZIP_NAME -u main.py)
```

***Backend code is now ready for deployment***


### Deploy


- Upload the zip file to S3 bucket, e.g. use AWS Console, or ASW CLI as I did below, or any other method of hour choice 
```
aws s3 cp backend/$ZIP_NAME s3://$BUCKET/$ZIP_NAME
```

- In the AWS Console, create a new Lambda function with the following options
    - Tick "Enable function URL" and select `NONE` as "Auth type" (unless you want to implement a proper authentication, not covered here)

- After the function is created
    - replaced the generated template code with your zip
    - in the `Function URL` sub-tab of the `Configuration` tab, take a note of the `Function URL` value, this will be used later to configure the frontend application
    - in the `Environment variables` sub-tab of the `Configuration` tab, create variables for all the environment variables as defined in `config.sh` with the same values 
    - under `Runtime settings` of the `Code` tab, change the `Handler` to `main.handler`
    - publish the Labmda function

*Lambda creation and subsequent updates can be easily scripted. For example, the following can be used for faster subsequent deployments of the existing function during the development*
```
aws lambda update-function-code --function-name $FUNCTION_NAME --s3-bucket $BUCKET --s3-key $ZIP_NAME --publish
```

### Test

***API should be working at this point***

- Try the `Function URL` value in the browser - you should see the Swagger docs for your API generated by the FastAPI
- Change the value of `REACT_APP_API_URL` in the `frontend/.env` file to be the Function URL value of the created Lambda function
- Launch the application
```
(cd frontend; npm start)
```

## Package and Deploy the application to S3

- First you need to enable CORS on the Lambda function. In the `Function URL` sub-tab of the `Configuration` tab of the deployed Lambda function, set the following properties

    - tick the `Configure cross-origin resource sharing (CORS)`
    - set the following properties

```
Allow origin: *
Expose headers: access-control-allow-origin
Allow headers: authorization
Allow methods: *
```

***Note that enabling CORS may break the React application running locally on your machine ,so you may need to flip it on/off depending on the location the frontend application is launched from***

- Set the value of the `REACT_APP_DIAGRAM_URL` variable in the `frontend/.env` file to be a URL of the diagram (a valid URL that can be resolved on the defice you'll be running an application from)

***I didn't figure out how to easily bundle an image into the final combined HTML file so used an external URL (a pre-signed URL for an image in my S3 bucket)***

- Build

```
(cd frontend; npm run build)
```

- Move the `<script..></script>` section in the `frontend/build/index.html` from `<head>` to `<body>` (place it right after `<div id="root"></div>`)
***This is needed bcause inline injected javascript seem to fail to find the `root` element otherwise, looks like it's not deferring the execution***

This is roughly how the final HTML needs to look
```
<!doctype html>
<html...>
    <head>....</head>
    <body>
        <div id="overlays"></div>
        <div id="root"></div>
        <script defer="defer" src="/static/js/main.xxxxx.js"></script>    
    </body>
</html>
```

- Package (this creates a single HTML file `frontend/package/index.html` with all the javascript and CSS embedded which can be served from S3 using pre-signed URL)
```
(cd frontend; npx gulp)
```

- Upload, sign and serve (for example using AWS CLI, this will return a pre-signed URL to test the application)
```
aws s3 cp frontend/package/index.html s3://$BUCKET/
aws s3 presign s3://$BUCKET/index.html --expires-in 604800
```
