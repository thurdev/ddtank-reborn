-- SQL_STORED_PROCEDURE dbo.SP_Server_Equip (modified 2021-06-04T05:18:35.680)


Create PROCEDURE [dbo].[SP_Server_Equip]
as
select value from Server_config 
where [Name]='Equip'







GO
