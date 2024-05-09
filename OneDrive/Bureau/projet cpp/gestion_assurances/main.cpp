#include <QApplication>
#include <QMessageBox>
#include <QtGlobal> // Include for qrand()
#include "smtpclient.h"
#include "mimepart.h"
#include "mimeattachment.h"
#include "emailaddress.h"
#include "mimetext.h"
#include <QDateTime>
#include "assurances.h"
#include "connection.h"
#include "gestion_assuranes.h"

    int main(int argc, char *argv[])
    {
        QApplication ass(argc, argv);
        Connection c;
        bool test = c.createconnect();
        gestion_assuranes w;
        if (test == true)
        {
            w.show();
            QMessageBox::information(nullptr, QObject::tr("Database is open"),
                                     QObject::tr("Connection successful.\n"
                                                 "Click Cancel to exit."), QMessageBox::Cancel);



        }
        else
        {
            QMessageBox::critical(nullptr, QObject::tr("Database is not open"),
                                  QObject::tr("Connection failed.\n"
                                              "Click Cancel to exit."), QMessageBox::Cancel);
        }
        return ass.exec();
}
