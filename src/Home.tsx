import { useEffect, useMemo, useState, useCallback } from 'react';
import * as anchor from '@project-serum/anchor';

import styled from 'styled-components';
import { Container, Snackbar } from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import Alert from '@material-ui/lab/Alert';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDialogButton } from '@solana/wallet-adapter-material-ui';
import {
  awaitTransactionSignatureConfirmation,
  CandyMachineAccount,
  CANDY_MACHINE_PROGRAM,
  getCandyMachineState,
  mintOneToken,
} from './candy-machine';
import { AlertState } from './utils';
import { Header } from './Header';
import { MintButton } from './MintButton';
import { GatewayProvider } from '@civic/solana-gateway-react';

const ConnectButton = styled(WalletDialogButton)`
  width: 100%;
  height: 60px;
  margin-top: 10px;
  margin-bottom: 5px;
  background: linear-gradient(180deg, #604ae5 0%, #813eee 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const MintContainer = styled.div``; // add your owns styles here

export interface HomeProps {
  candyMachineId?: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  txTimeout: number;
  rpcHost: string;
}

const Home = (props: HomeProps) => {
  const [isUserMinting, setIsUserMinting] = useState(false);
  const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: undefined,
  });

  const rpcUrl = props.rpcHost;
  const wallet = useWallet();

  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet]);

  const refreshCandyMachineState = useCallback(async () => {
    if (!anchorWallet) {
      return;
    }

    if (props.candyMachineId) {
      try {
        const cndy = await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection,
        );
        setCandyMachine(cndy);
      } catch (e) {
        console.log('There was a problem fetching Candy Machine state');
        console.log(e);
      }
    }
  }, [anchorWallet, props.candyMachineId, props.connection]);

  const onMint = async () => {
    try {
      setIsUserMinting(true);
      document.getElementById('#identity')?.click();
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mintTxId = (
          await mintOneToken(candyMachine, wallet.publicKey)
        )[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            true,
          );
        }

        if (status && !status.err) {
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          window.location.reload();
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      setIsUserMinting(false);
    }
  };

  useEffect(() => {
    refreshCandyMachineState();
  }, [
    anchorWallet,
    props.candyMachineId,
    props.connection,
    refreshCandyMachineState,
  ]);

  return (
    <div>
    {/* navbar : start */}
    <nav className="justify-content-end navbar navbar-expand-md navbar-dark">
      {/* <a class="navbar-brand" href="#">Navbar</a> */}
      <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNavAltMarkup" aria-controls="navbarNavAltMarkup" aria-expanded="false" aria-label="Toggle navigation">
        <span className="navbar-toggler-icon" />
      </button>
      <div className="container">
        <div className="collapse navbar-collapse justify-content-end" id="navbarNavAltMarkup">
          <div className="navbar-nav">
            <a className="text-uppercase nav-link active" href="#home">Home</a>
            <a className="text-uppercase nav-link" href="#content">Poi</a>
            <a className="text-uppercase nav-link" href="#faq">Faq</a>
            <a className="text-uppercase nav-link" href="#team">Team</a>
          </div>
        </div>
      </div>
    </nav>
    {/* navbar : end */}
    {/* jumbotron : start */}
    <div id="jumbotron">
      <div className="container">
        <img src="./assets/Logo.png" alt="" className="w-100" />
      </div>
    </div>
    {/* jumbotron : end */}
    {/* five kongs : start */}
    {/* <div id="fivekongs">
      <div className="container">
        <img src="./assets/5_Kongz.png" alt="" className="w-100" />
      </div>
    </div> */}
    {/* five kongs : end */}
    {/* content : start */}
    <div id="content">
    <div className="pt-5 pb-5 mt-3 mb-3">
    <h2 className='text-center text-white'>
        MINT NOW!!
    </h2>
    <Container id="MintContain">
          <Container maxWidth="xs">
            <Paper
              style={{ padding: 24, backgroundColor: '#151A1F', borderRadius: 6 }}
            >
              {!wallet.connected ? (
                <ConnectButton>Connect Wallet</ConnectButton>
              ) : (
                <>
                  <Header candyMachine={candyMachine} />
                  <MintContainer>
                    {candyMachine?.state.isActive &&
                    candyMachine?.state.gatekeeper &&
                    wallet.publicKey &&
                    wallet.signTransaction ? (
                      <GatewayProvider
                        wallet={{
                          publicKey:
                            wallet.publicKey ||
                            new PublicKey(CANDY_MACHINE_PROGRAM),
                          //@ts-ignore
                          signTransaction: wallet.signTransaction,
                        }}
                        gatekeeperNetwork={
                          candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                        }
                        clusterUrl={rpcUrl}
                        options={{ autoShowModal: false }}
                      >
                        <MintButton
                          candyMachine={candyMachine}
                          isMinting={isUserMinting}
                          onMint={onMint}
                        />
                      </GatewayProvider>
                    ) : (
                      <MintButton
                        candyMachine={candyMachine}
                        isMinting={isUserMinting}
                        onMint={onMint}
                      />
                    )}
                  </MintContainer>
                </>
              )}
            </Paper>
          </Container>

  <Snackbar
    open={alertState.open}
    autoHideDuration={6000}
    onClose={() => setAlertState({ ...alertState, open: false })}
  >
    <Alert
      onClose={() => setAlertState({ ...alertState, open: false })}
      severity={alertState.severity}
    >
      {alertState.message}
    </Alert>
  </Snackbar>
        </Container>
    </div>
      <div className="container">
        <div id="whyyoushouldmint">
          <h3 className="text-uppercase text-center">Why you should mint</h3>
          <p className="mt-5">Perhaps this is the most crucial question</p>
          <ol>
            <li>
              We have a small supply which indicates how exclusive this project
              is.
            </li>
            <li>
              The first utility that we will create is astaking system with
              liquidity which will continue to be added gradually over several
              months.
            </li>
            <li>
              We are not bound by the roadmap, wherever and whatever the
              decision of the holders will be our map in carrying out this
              project.
            </li>
          </ol>
        </div>
        <div id="faq">
          <h3 className="text-uppercase text-center">faq</h3>
          <div className="d-flex flex-column mt-5" style={{gap: '1.5rem'}}>
            <div>
              <p className="m-0" id="q">How much supply </p>
              <p className="m-0" id="a">We are uniquely generated 555 Madkongz</p>
            </div>
            <div>
              <p className="m-0" id="q">Mint Date </p>
              <p className="m-0" id="a">Feb 28th 2022</p>
            </div>
            <div>
              <p className="m-0" id="q">Mint Price</p>
              <p className="m-0" id="a">0.35 SOL for BigKongz (Whitelisted) and 0.55 SOL for Kongz (Public)</p>
            </div>
            <div>
              <p className="m-0" id="q">Roadmap</p>
              <p className="m-0" id="a">
                We have no roadmap but no roadmap does not mean no utilities, it
                just simply means that the future of madkongz will not be
                limited or tied to any "Roadmap"
              </p>
            </div>
          </div>
        </div>
        <div id="team">
          <h3 className="text-uppercase text-center">Team</h3>
          <div className="d-flex flex-md-nowrap flex-wrap mt-5" style={{gap: '1rem'}}>
            <div className="align-items-center d-flex flex-column">
              <img src="./assets/Doom.png" alt="" className="w-50" />
              <p className="m-0 text-center">Murdock </p>
              <p className="m-0 text-center">co-founder</p>
              <p className="m-0 text-center" style={{marginTop: '-1rem !important'}}>marketing and relation</p>
            </div>
            <div className="align-items-center d-flex flex-column">
              <img src="./assets/Murdock.png" alt="" className="w-50" />
              <p className="m-0 text-center">Doom </p>
              <p className="m-0 text-center">Founder</p>
              <p className="m-0 text-center" style={{marginTop: '-1rem !important'}}>artist</p>
            </div>
            <div className="align-items-center d-flex flex-column">
              <img src="./assets/Doom.png" alt="" className="w-50" />
              <p className="m-0 text-center">Kongz King</p>
              <p className="m-0 text-center">co-founder</p>
              <p className="m-0 text-center" style={{marginTop: '-1rem !important'}}>Programmer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* content : end */}
  </div>
  );
};

export default Home;
