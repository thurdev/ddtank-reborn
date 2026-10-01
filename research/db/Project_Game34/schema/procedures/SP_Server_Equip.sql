-- SQL_STORED_PROCEDURE dbo.SP_Server_Equip (modified 2021-06-04T01:29:18.477)


Create PROCEDURE [dbo].[SP_Server_Equip]
as
select value from Server_config 
where [Name]='Equip'







GO
