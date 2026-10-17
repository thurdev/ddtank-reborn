-- SQL_STORED_PROCEDURE dbo.Inser_VindicateServer_Sto (modified 2012-04-21T07:53:24.920)
CREATE proc Inser_VindicateServer_Sto
@server int
as
begin
insert vindicate values('','','',@server,'',1)
end



GO
