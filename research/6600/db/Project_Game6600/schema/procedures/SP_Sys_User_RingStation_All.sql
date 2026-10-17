-- SQL_STORED_PROCEDURE dbo.SP_Sys_User_RingStation_All (modified 2015-01-25T14:04:48.180)
CREATE  PROCEDURE [dbo].[SP_Sys_User_RingStation_All]
    AS
         BEGIN
            SELECT * FROM Sys_User_RingStation
         END

GO
